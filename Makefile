.PHONY: build test lint install clean

build:
	go build -o bin/mymind ./cmd/mymind

test:
	go test ./...

lint:
	golangci-lint run

install:
	go install ./cmd/mymind

clean:
	rm -rf bin/

build-mcp:
	go build -o bin/mymind-mcp ./cmd/mymind-mcp

install-mcp:
	go install ./cmd/mymind-mcp

build-all: build build-mcp
