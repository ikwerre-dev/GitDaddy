package names

import "strings"

var reserved = map[string]struct{}{
	"_next":     {},
	"api":       {},
	"auth":      {},
	"dashboard": {},
	"git":       {},
	"healthz":   {},
	"issues":    {},
	"login":     {},
	"logout":    {},
	"metrics":   {},
	"new":       {},
	"pulls":     {},
	"register":  {},
	"settings":  {},
	"stars":     {},
}

func Reserved(value string) bool {
	_, ok := reserved[strings.ToLower(strings.TrimSpace(value))]
	return ok
}
