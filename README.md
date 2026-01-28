# Money Transfer Assessment (Full Stack)

A simple money transfer system (Japan → Nepal) with OTP authentication, JWT-protected APIs, MSSQL persistence, Redis rate limiting, and Kafka event-driven transaction processing.

## Tech Stack

**Backend**
- Node.js (Express)
- MSSQL (mssql driver)
- Zod (validation)
- JWT (auth)
- Redis (OTP rate limiting)
- Kafka/Redpanda (producer + consumer using KafkaJS)

**Frontend**
- React (if included in this repo)

## Project Structure

money-transfer-assessment/
backend/
src/
config/ # db, redis, kafka configs
middleware/ # auth, validate, rate limit
modules/
auth/
senders/
receivers/
transactions/
worker/ # kafka consumers
frontend/ # UI (if implemented)

## Setup (Backend)

1) Clone the repository
```bash
    git clone https://github.com/sumitDon47/money-transfer-assessment
    cd money-transfer-assessment/backend

2) Install dependencies
    npm install

3) Create .env
    Create backend/.env:
    PORT=4000

    DB_SERVER=localhost
    DB_DATABASE=MoneyTransferDB
    DB_USER=sa
    DB_PASSWORD=SqlServer@123
    DB_ENCRYPT=false

    JWT_SECRET=dev-secret

    REDIS_HOST=127.0.0.1
    REDIS_PORT=6379

    KAFKA_BROKER=127.0.0.1:9092
    KAFKA_CLIENT_ID=money-transfer-backend

    ** Database (MSSQL)

    Create a database and tables using your provided SQL scripts.

    Connect
