package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID           int64     `json:"id"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

type UserStore interface {
	CreateUser(context.Context, User) (User, error)
	FindByUsername(context.Context, string) (User, error)
	FindByID(context.Context, int64) (User, error)
}

type SessionStore interface {
	Save(context.Context, string, int64, time.Time) error
	Resolve(context.Context, string) (int64, error)
	Delete(context.Context, string) error
}

type PersonalAccessToken struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	Name      string    `json:"name"`
	Prefix    string    `json:"prefix"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
}

type TokenStore interface {
	Create(context.Context, PersonalAccessToken, string) (PersonalAccessToken, error)
	ListByUser(context.Context, int64) ([]PersonalAccessToken, error)
	FindByPlaintext(context.Context, string) (PersonalAccessToken, error)
	Delete(context.Context, int64, int64) error
}

type Service struct {
	users     UserStore
	sessions  SessionStore
	apiTokens TokenStore
}

func NewService(users UserStore, sessions SessionStore) *Service {
	return &Service{users: users, sessions: sessions, apiTokens: NewMemoryTokenStore()}
}

func NewServiceWithTokens(users UserStore, sessions SessionStore, apiTokens TokenStore) *Service {
	return &Service{users: users, sessions: sessions, apiTokens: apiTokens}
}

func (s *Service) Register(ctx context.Context, username, email, password string) (User, error) {
	username = strings.TrimSpace(strings.ToLower(username))
	if username == "" || password == "" {
		return User{}, errors.New("username and password are required")
	}
	return s.users.CreateUser(ctx, User{
		Username:     username,
		Email:        strings.TrimSpace(email),
		PasswordHash: HashPassword(password),
		CreatedAt:    time.Now().UTC(),
	})
}

func (s *Service) Login(ctx context.Context, username, password string) (string, User, error) {
	user, err := s.AuthenticatePassword(ctx, username, password)
	if err != nil {
		return "", User{}, err
	}
	token := randomToken()
	if err := s.sessions.Save(ctx, token, user.ID, time.Now().Add(24*time.Hour)); err != nil {
		return "", User{}, err
	}
	return token, user, nil
}

func (s *Service) AuthenticatePassword(ctx context.Context, username, password string) (User, error) {
	user, err := s.users.FindByUsername(ctx, strings.TrimSpace(strings.ToLower(username)))
	if err != nil {
		return User{}, errors.New("invalid credentials")
	}
	if !VerifyPassword(user.PasswordHash, password) {
		return User{}, errors.New("invalid credentials")
	}
	return user, nil
}

func (s *Service) AuthenticateGit(ctx context.Context, username, secret string) (User, error) {
	if strings.HasPrefix(secret, "gtd_") {
		token, err := s.apiTokens.FindByPlaintext(ctx, secret)
		if err != nil || time.Now().After(token.ExpiresAt) {
			return User{}, errors.New("invalid credentials")
		}
		user, err := s.findByID(ctx, token.UserID)
		if err != nil {
			return User{}, errors.New("invalid credentials")
		}
		if username != "" && !strings.EqualFold(username, user.Username) {
			return User{}, errors.New("invalid credentials")
		}
		return user, nil
	}
	return s.AuthenticatePassword(ctx, username, secret)
}

func (s *Service) CurrentUser(ctx context.Context, token string) (User, error) {
	userID, err := s.sessions.Resolve(ctx, token)
	if err != nil {
		return User{}, err
	}
	return s.findByID(ctx, userID)
}

func (s *Service) Logout(ctx context.Context, token string) error {
	return s.sessions.Delete(ctx, token)
}

func (s *Service) FindByUsername(ctx context.Context, username string) (User, error) {
	return s.users.FindByUsername(ctx, strings.TrimSpace(strings.ToLower(username)))
}

func (s *Service) FindByID(ctx context.Context, id int64) (User, error) {
	return s.findByID(ctx, id)
}

func (s *Service) CreateToken(ctx context.Context, userID int64, name string, ttl time.Duration) (PersonalAccessToken, string, error) {
	if strings.TrimSpace(name) == "" {
		return PersonalAccessToken{}, "", errors.New("token name is required")
	}
	if ttl <= 0 {
		ttl = 90 * 24 * time.Hour
	}
	plaintext := "gtd_" + randomToken()
	token := PersonalAccessToken{
		UserID:    userID,
		Name:      strings.TrimSpace(name),
		Prefix:    plaintext[:12],
		CreatedAt: time.Now().UTC(),
		ExpiresAt: time.Now().UTC().Add(ttl),
	}
	created, err := s.apiTokens.Create(ctx, token, HashSecret(plaintext))
	return created, plaintext, err
}

func (s *Service) ListTokens(ctx context.Context, userID int64) ([]PersonalAccessToken, error) {
	return s.apiTokens.ListByUser(ctx, userID)
}

func (s *Service) DeleteToken(ctx context.Context, userID, tokenID int64) error {
	return s.apiTokens.Delete(ctx, userID, tokenID)
}

func (s *Service) findByID(ctx context.Context, id int64) (User, error) {
	return s.users.FindByID(ctx, id)
}

func HashPassword(password string) string {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		panic(err)
	}
	return string(hash)
}

func VerifyPassword(hash, password string) bool {
	if strings.HasPrefix(hash, "$2a$") || strings.HasPrefix(hash, "$2b$") || strings.HasPrefix(hash, "$2y$") {
		return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
	}
	return hash == legacySHA256(password)
}

func HashSecret(secret string) string {
	return legacySHA256(secret)
}

func legacySHA256(value string) string {
	sum := sha256.Sum256([]byte("gitdaddy:" + value))
	return hex.EncodeToString(sum[:])
}

func randomToken() string {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		panic(err)
	}
	return hex.EncodeToString(bytes)
}

type MemoryTokenStore struct {
	mu     sync.RWMutex
	nextID int64
	tokens map[int64]PersonalAccessToken
	byHash map[string]int64
	hashes map[int64]string
}

func NewMemoryTokenStore() *MemoryTokenStore {
	return &MemoryTokenStore{
		nextID: 1,
		tokens: map[int64]PersonalAccessToken{},
		byHash: map[string]int64{},
		hashes: map[int64]string{},
	}
}

func (s *MemoryTokenStore) Create(_ context.Context, token PersonalAccessToken, hash string) (PersonalAccessToken, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	token.ID = s.nextID
	s.nextID++
	s.tokens[token.ID] = token
	s.byHash[hash] = token.ID
	s.hashes[token.ID] = hash
	return token, nil
}

func (s *MemoryTokenStore) ListByUser(_ context.Context, userID int64) ([]PersonalAccessToken, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	tokens := []PersonalAccessToken{}
	for _, token := range s.tokens {
		if token.UserID == userID {
			tokens = append(tokens, token)
		}
	}
	return tokens, nil
}

func (s *MemoryTokenStore) FindByPlaintext(_ context.Context, plaintext string) (PersonalAccessToken, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.byHash[HashSecret(plaintext)]
	if !ok {
		return PersonalAccessToken{}, errors.New("token not found")
	}
	token := s.tokens[id]
	return token, nil
}

func (s *MemoryTokenStore) Delete(_ context.Context, userID, tokenID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	token, ok := s.tokens[tokenID]
	if !ok || token.UserID != userID {
		return fmt.Errorf("token not found")
	}
	delete(s.tokens, tokenID)
	delete(s.byHash, s.hashes[tokenID])
	delete(s.hashes, tokenID)
	return nil
}

type MemoryUserStore struct {
	mu     sync.RWMutex
	nextID int64
	users  map[int64]User
	byName map[string]int64
}

func NewMemoryUserStore() *MemoryUserStore {
	return &MemoryUserStore{nextID: 1, users: map[int64]User{}, byName: map[string]int64{}}
}

func (s *MemoryUserStore) CreateUser(_ context.Context, user User) (User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.byName[user.Username]; exists {
		return User{}, errors.New("username already exists")
	}
	user.ID = s.nextID
	s.nextID++
	s.users[user.ID] = user
	s.byName[user.Username] = user.ID
	return user, nil
}

func (s *MemoryUserStore) FindByUsername(_ context.Context, username string) (User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.byName[username]
	if !ok {
		return User{}, errors.New("user not found")
	}
	return s.users[id], nil
}

func (s *MemoryUserStore) FindByID(_ context.Context, id int64) (User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	user, ok := s.users[id]
	if !ok {
		return User{}, errors.New("user not found")
	}
	return user, nil
}

type MemorySessionStore struct {
	mu       sync.RWMutex
	sessions map[string]session
}

type session struct {
	userID int64
	expiry time.Time
}

func NewMemorySessionStore() *MemorySessionStore {
	return &MemorySessionStore{sessions: map[string]session{}}
}

func (s *MemorySessionStore) Save(_ context.Context, token string, userID int64, expiry time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[token] = session{userID: userID, expiry: expiry}
	return nil
}

func (s *MemorySessionStore) Resolve(_ context.Context, token string) (int64, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	session, ok := s.sessions[token]
	if !ok || time.Now().After(session.expiry) {
		return 0, errors.New("invalid session")
	}
	return session.userID, nil
}

func (s *MemorySessionStore) Delete(_ context.Context, token string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, token)
	return nil
}
