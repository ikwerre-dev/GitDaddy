package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"sync"
	"time"
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
}

type SessionStore interface {
	Save(context.Context, string, int64, time.Time) error
	Resolve(context.Context, string) (int64, error)
	Delete(context.Context, string) error
}

type Service struct {
	users    UserStore
	sessions SessionStore
}

func NewService(users UserStore, sessions SessionStore) *Service {
	return &Service{users: users, sessions: sessions}
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
	if user.PasswordHash != HashPassword(password) {
		return User{}, errors.New("invalid credentials")
	}
	return user, nil
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

func (s *Service) findByID(ctx context.Context, id int64) (User, error) {
	if mem, ok := s.users.(*MemoryUserStore); ok {
		return mem.FindByID(ctx, id)
	}
	return User{}, errors.New("user lookup by id unsupported")
}

func HashPassword(password string) string {
	sum := sha256.Sum256([]byte("gitdaddy:" + password))
	return hex.EncodeToString(sum[:])
}

func randomToken() string {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		panic(err)
	}
	return hex.EncodeToString(bytes)
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
