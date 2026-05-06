package storage

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

type ObjectStore interface {
	Put(context.Context, string, []byte) error
	Get(context.Context, string) ([]byte, error)
}

type LocalObjectStore struct {
	root string
}

func NewLocalObjectStore(root string) *LocalObjectStore {
	return &LocalObjectStore{root: root}
}

func (s *LocalObjectStore) Put(_ context.Context, key string, body []byte) error {
	path := filepath.Join(s.root, key)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, body, 0o644)
}

func (s *LocalObjectStore) Get(_ context.Context, key string) ([]byte, error) {
	return os.ReadFile(filepath.Join(s.root, key))
}

type EnvConfig struct {
	ObjectRoot      string
	R2Endpoint      string
	R2Bucket        string
	R2AccessKeyID   string
	R2SecretKey     string
	R2Region        string
	ForceLocalStore bool
}

func NewFromEnv(config EnvConfig) (ObjectStore, string, error) {
	if !config.ForceLocalStore && config.R2Endpoint != "" && config.R2Bucket != "" && config.R2AccessKeyID != "" && config.R2SecretKey != "" {
		region := config.R2Region
		if region == "" {
			region = "auto"
		}
		store, err := NewR2ObjectStore(config.R2Endpoint, config.R2Bucket, config.R2AccessKeyID, config.R2SecretKey, region)
		return store, "r2", err
	}
	if config.ObjectRoot == "" {
		return nil, "", errors.New("object root is required for local object storage")
	}
	return NewLocalObjectStore(config.ObjectRoot), "local", nil
}

type R2ObjectStore struct {
	endpoint  *url.URL
	bucket    string
	accessKey string
	secretKey string
	region    string
	client    *http.Client
}

func NewR2ObjectStore(endpoint, bucket, accessKey, secretKey, region string) (*R2ObjectStore, error) {
	parsed, err := url.Parse(strings.TrimRight(endpoint, "/"))
	if err != nil {
		return nil, err
	}
	if parsed.Scheme == "" || parsed.Host == "" {
		return nil, errors.New("R2 endpoint must include scheme and host")
	}
	if bucket == "" || accessKey == "" || secretKey == "" {
		return nil, errors.New("R2 bucket and credentials are required")
	}
	if region == "" {
		region = "auto"
	}
	return &R2ObjectStore{
		endpoint:  parsed,
		bucket:    bucket,
		accessKey: accessKey,
		secretKey: secretKey,
		region:    region,
		client:    &http.Client{Timeout: 30 * time.Second},
	}, nil
}

func (s *R2ObjectStore) Put(ctx context.Context, key string, body []byte) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, s.objectURL(key), bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/octet-stream")
	s.sign(req, body)
	res, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		message, _ := io.ReadAll(io.LimitReader(res.Body, 4096))
		return fmt.Errorf("r2 put failed: %s: %s", res.Status, strings.TrimSpace(string(message)))
	}
	return nil
}

func (s *R2ObjectStore) Get(ctx context.Context, key string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.objectURL(key), nil)
	if err != nil {
		return nil, err
	}
	s.sign(req, nil)
	res, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, fmt.Errorf("r2 get failed: %s: %s", res.Status, strings.TrimSpace(string(body)))
	}
	return body, nil
}

func (s *R2ObjectStore) objectURL(key string) string {
	cleanKey := strings.TrimLeft(key, "/")
	escaped := strings.Join(escapePathSegments(s.bucket+"/"+cleanKey), "/")
	return strings.TrimRight(s.endpoint.String(), "/") + "/" + escaped
}

func (s *R2ObjectStore) sign(req *http.Request, body []byte) {
	now := time.Now().UTC()
	amzDate := now.Format("20060102T150405Z")
	date := now.Format("20060102")
	bodyHash := sha256Hex(body)

	req.Header.Set("Host", req.URL.Host)
	req.Header.Set("X-Amz-Content-Sha256", bodyHash)
	req.Header.Set("X-Amz-Date", amzDate)

	signedHeaders := signedHeaderNames(req.Header)
	canonicalRequest := strings.Join([]string{
		req.Method,
		canonicalURI(req.URL.EscapedPath()),
		req.URL.RawQuery,
		canonicalHeaders(req.Header, signedHeaders),
		strings.Join(signedHeaders, ";"),
		bodyHash,
	}, "\n")
	scope := date + "/" + s.region + "/s3/aws4_request"
	stringToSign := strings.Join([]string{
		"AWS4-HMAC-SHA256",
		amzDate,
		scope,
		sha256Hex([]byte(canonicalRequest)),
	}, "\n")
	signingKey := awsSigningKey(s.secretKey, date, s.region, "s3")
	signature := hex.EncodeToString(hmacSHA256(signingKey, stringToSign))
	req.Header.Set("Authorization", fmt.Sprintf("AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s", s.accessKey, scope, strings.Join(signedHeaders, ";"), signature))
}

func signedHeaderNames(headers http.Header) []string {
	names := make([]string, 0, len(headers))
	for key := range headers {
		names = append(names, strings.ToLower(key))
	}
	sort.Strings(names)
	return names
}

func canonicalHeaders(headers http.Header, names []string) string {
	var builder strings.Builder
	for _, name := range names {
		values := headers.Values(name)
		if len(values) == 0 {
			values = headers.Values(http.CanonicalHeaderKey(name))
		}
		for i := range values {
			values[i] = strings.Join(strings.Fields(values[i]), " ")
		}
		builder.WriteString(name)
		builder.WriteByte(':')
		builder.WriteString(strings.Join(values, ","))
		builder.WriteByte('\n')
	}
	return builder.String()
}

func canonicalURI(path string) string {
	if path == "" {
		return "/"
	}
	return path
}

func escapePathSegments(path string) []string {
	segments := strings.Split(path, "/")
	for i, segment := range segments {
		segments[i] = url.PathEscape(segment)
	}
	return segments
}

func sha256Hex(body []byte) string {
	sum := sha256.Sum256(body)
	return hex.EncodeToString(sum[:])
}

func awsSigningKey(secret, date, region, service string) []byte {
	kDate := hmacSHA256([]byte("AWS4"+secret), date)
	kRegion := hmacSHA256(kDate, region)
	kService := hmacSHA256(kRegion, service)
	return hmacSHA256(kService, "aws4_request")
}

func hmacSHA256(key []byte, value string) []byte {
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(value))
	return mac.Sum(nil)
}
