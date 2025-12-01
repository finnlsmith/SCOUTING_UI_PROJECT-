.PHONY: help test test-unit test-integration test-coverage test-watch install-test

help:
	@echo "Available test commands:"
	@echo "  make test              - Run all tests"
	@echo "  make test-unit         - Run unit tests only"
	@echo "  make test-integration  - Run integration tests only"
	@echo "  make test-coverage     - Run tests with coverage report"
	@echo "  make test-watch        - Run tests in watch mode (requires pytest-watch)"
	@echo "  make install-test      - Install test dependencies"

test:
	pytest tests/ -v

test-unit:
	pytest tests/unit/ -v -m unit

test-integration:
	pytest tests/integration/ -v -m integration

test-coverage:
	pytest tests/ --cov=. --cov-report=html --cov-report=term-missing

test-watch:
	pytest-watch tests/

install-test:
	pip install -r requirements.txt

