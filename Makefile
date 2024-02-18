.PHONY: auth run

auth:
	python auth.py

run:
	docker-compose up --build -d

all: auth run
