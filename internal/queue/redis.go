package queue

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const DefaultRedisQueueKey = "gitdaddy:jobs"

type RedisQueue struct {
	addr     string
	password string
	db       int
	key      string
	timeout  time.Duration
}

func NewRedisQueue(rawURL, key string) (*RedisQueue, error) {
	if key == "" {
		key = DefaultRedisQueueKey
	}
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return nil, err
	}
	if parsed.Scheme != "redis" {
		return nil, errors.New("redis url must use redis://")
	}
	addr := parsed.Host
	if !strings.Contains(addr, ":") {
		addr += ":6379"
	}
	db := 0
	if path := strings.Trim(parsed.Path, "/"); path != "" {
		db, err = strconv.Atoi(path)
		if err != nil {
			return nil, err
		}
	}
	password, _ := parsed.User.Password()
	return &RedisQueue{addr: addr, password: password, db: db, key: key, timeout: 5 * time.Second}, nil
}

func (q *RedisQueue) Enqueue(ctx context.Context, job Job) error {
	body, err := json.Marshal(job)
	if err != nil {
		return err
	}
	_, err = q.command(ctx, "RPUSH", q.key, string(body))
	return err
}

func (q *RedisQueue) Dequeue(ctx context.Context) (Job, error) {
	value, err := q.command(ctx, "BLPOP", q.key, strconv.Itoa(int(q.timeout.Seconds())))
	if err != nil {
		return Job{}, err
	}
	items, ok := value.([]any)
	if !ok || len(items) != 2 {
		return Job{}, errors.New("queue empty")
	}
	payload, ok := items[1].(string)
	if !ok {
		return Job{}, errors.New("invalid redis queue payload")
	}
	var job Job
	if err := json.Unmarshal([]byte(payload), &job); err != nil {
		return Job{}, err
	}
	return job, nil
}

func (q *RedisQueue) Len() int {
	value, err := q.command(context.Background(), "LLEN", q.key)
	if err != nil {
		return 0
	}
	count, _ := value.(int)
	return count
}

func (q *RedisQueue) command(ctx context.Context, args ...string) (any, error) {
	var dialer net.Dialer
	conn, err := dialer.DialContext(ctx, "tcp", q.addr)
	if err != nil {
		return nil, err
	}
	defer conn.Close()
	if deadline, ok := ctx.Deadline(); ok {
		_ = conn.SetDeadline(deadline)
	} else {
		_ = conn.SetDeadline(time.Now().Add(q.timeout + 2*time.Second))
	}
	reader := bufio.NewReader(conn)
	if q.password != "" {
		if err := writeRESP(conn, "AUTH", q.password); err != nil {
			return nil, err
		}
		if _, err := readRESP(reader); err != nil {
			return nil, err
		}
	}
	if q.db != 0 {
		if err := writeRESP(conn, "SELECT", strconv.Itoa(q.db)); err != nil {
			return nil, err
		}
		if _, err := readRESP(reader); err != nil {
			return nil, err
		}
	}
	if err := writeRESP(conn, args...); err != nil {
		return nil, err
	}
	return readRESP(reader)
}

func writeRESP(conn net.Conn, args ...string) error {
	if _, err := fmt.Fprintf(conn, "*%d\r\n", len(args)); err != nil {
		return err
	}
	for _, arg := range args {
		if _, err := fmt.Fprintf(conn, "$%d\r\n%s\r\n", len(arg), arg); err != nil {
			return err
		}
	}
	return nil
}

func readRESP(reader *bufio.Reader) (any, error) {
	prefix, err := reader.ReadByte()
	if err != nil {
		return nil, err
	}
	line, err := reader.ReadString('\n')
	if err != nil {
		return nil, err
	}
	line = strings.TrimSuffix(strings.TrimSuffix(line, "\n"), "\r")
	switch prefix {
	case '+':
		return line, nil
	case '-':
		return nil, errors.New(line)
	case ':':
		return strconv.Atoi(line)
	case '$':
		size, err := strconv.Atoi(line)
		if err != nil {
			return nil, err
		}
		if size < 0 {
			return nil, errors.New("queue empty")
		}
		buf := make([]byte, size+2)
		if _, err := io.ReadFull(reader, buf); err != nil {
			return nil, err
		}
		return string(buf[:size]), nil
	case '*':
		count, err := strconv.Atoi(line)
		if err != nil {
			return nil, err
		}
		if count < 0 {
			return nil, errors.New("queue empty")
		}
		items := make([]any, 0, count)
		for i := 0; i < count; i++ {
			item, err := readRESP(reader)
			if err != nil {
				return nil, err
			}
			items = append(items, item)
		}
		return items, nil
	default:
		return nil, fmt.Errorf("unknown redis response prefix %q", prefix)
	}
}
