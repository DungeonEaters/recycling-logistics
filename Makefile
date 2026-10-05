.PHONY: up down logs test reset web mobile

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f api

test:
	docker compose run --rm --no-deps -e DATABASE_URL=sqlite+pysqlite:///:memory: api pytest -q

reset:
	docker compose down -v && docker compose up -d --build

web:
	cd web && npm install && npm run dev

mobile:
	cd mobile && npm install && npm run dev
