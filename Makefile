.PHONY: test build web-build compose-check full-test dev stop reset

test:
	go test ./...

build:
	go build ./cmd/backend ./cmd/worker ./cmd/r2-smoke

web-build:
	cd web && npm run build

compose-check:
	docker compose config >/dev/null

full-test:
	./test.sh

dev:
	./start.sh

stop:
	./stop.sh

reset:
	./reset.sh
