** Money Transfer Assessment – Full Stack Application **

Project Overview

    It is a web-based money transfer app that is a full-stack web application developed during a technical evaluation.
    It shows safe authentication through Email OTP, transaction write and read, asynchronous processing via Kafka and a current React + Material UI user interface.

    The system allows users to:
        Log in using OTP sent to email

        Create money transfer transactions

        View transaction history

        Process transactions asynchronously via a Kafka consumer

Tech Stack

    Backend
        -Node.js
        -Express.js
        -Microsoft SQL Sever
        -Kafka (Redpanda / KafkaJS)
        -Redis
        -JWT Authentication
        -Nodemailer (Ethereal)
        -bcrypt
    
    Frontend
        -React(Vite)
        -Material UI(MUI)
        -Axios
        -React Router

Project Structure
    money-transfer-assessment/
    │
    ├── backend/
    │   ├── src/
    │   │   ├── app.js
    │   │   ├── server.js
    │   │   ├── config/
    │   │   │   ├── db.js
    │   │   │   ├── kafka.js
    │   │   │   ├── redis.js
    │   │   │   ├── mailer.js
    │   │   │   └── env.js
    │   │   ├── middleware/
    │   │   │   ├── auth.js
    │   │   │   ├── auth.js.save
    │   │   │   ├── redisOtpLimit.js
    │   │   │   └── validate.js
    │   │   │ 
    │   │   ├── modules/
    │   │   │   ├── auth/
    │   │   │   │   ├── authcontroller.js
    │   │   │   │   └── auth.routes.js      
    │   │   │   ├── receivers/
    │   │   │   │   ├── receivers.controller.js
    │   │   │   │   ├── receivers.routes.js
    │   │   │   │   └── receivers.schema.js     
    │   │   │   ├── senders/
    │   │   │   │   ├── senders.controller.js
    │   │   │   │   ├── senders.routes.js
    │   │   │   │   └── senders.schema.js               
    │   │   │   └── transactions/
    │   │   │       ├── transactions.controller.js
    │   │   │       ├── transactions.producer.js
    │   │   │       ├── transactions.routes.js
    │   │   │       └── transactions.schema.js   
    │   │   └── worker/
    │   │       ├── runConsumer.js    
    │   │       └── transactions.consumer.js
    │   └── .env
    │
    ├── frontend/
    │   ├── src/
    │   │   ├── api/
    │   │   │   ├── auth.js
    │   │   │   ├── clien.js
    │   │   │   ├── receiver.js
    │   │   │   ├── sender.js
    │   │   │   └── transactions.js
    │   │   ├── pages/
    │   │   │   ├── LoginOtp.jsx
    │   │   │   └── Dashboard.jsx
    │   │   ├── components/
    │   │   │   ├── ReceiversTab.jsx
    │   │   │   ├── SenderTab.jsx
    │   │   │   └── TransactionsTab.jsx
    │   │   ├── utils/
    │   │   │   └── auth.js
    │   │   ├── App.css
    │   │   ├── App.jsx
    │   │   ├── index.css
    │   │   └── main.jsx
    │   ├── eslint.config.js
    │   ├── index.html
    │   └── vite.config.js
    │
    └── README.md

Authentication Flow (OTP Login)

    1. User enters email
    2. Backend generates a 6-digit OTP
    3. OTP is:
        -Hashed and stored in database
        -Sent via email (Ethereal / SMTP)
    4. User enters OTP
    5. Backend verifies OTP and issues JWT token
    6. Token is stored in localStorage and used for authenticated requests

Transaction Flow

    1. User creates a transaction from the frontend
    2. Backend:
        -Saves transaction with status PENDING
        -Publishes event to Kafka topic transactions.created
    3. Kafka Consumer:
        -Listens to transactions.created
        -Processes transaction
        -Updates status to SUCCESS or FAILED
    4. Frontend fetches and displays transactions list

API Endpoints

    Auth
        -POST /auth/request-otp
        -POST /auth/verify-otp
    
    Transactions
        -POST /transactions
        -GET /transactions
    
    All protected routes require:
        -Authorization: Bearer <JWT_TOKEN>

Environment Variables (backend/.env)
    DB_SERVER=localhost
    DB_DATABASE=MoneyTransferDB
    DB_USER=sa
    DB_PASSWORD=SqlServer@123
    DB_ENCRYPT=false

    REDIS_HOST=127.0.0.1
    REDIS_PORT=6379

    KAFKA_BROKER=127.0.0.1:9092

    JWT_SECRET=dev-secret

    MAIL_MODE=ethereal
    MAIL_FROM="Money Transfer <no-reply@moneytransfer.test>"

How to Run the Project

    Backend 
        cd backend
        npm install
        npm run dev

    Kafka Consumer
        cd backend
        npm run consumer
    
    Frontend
        cd frontend
        npm install
        npm run dev

    Frontend runs on:
        http://localhost:5173

    Backend runs on: 
        http://localhost:4000

Features Implemented
    - Email-based OTP authentication
    - JWT-secured APIs
    - Transaction creation & listing
    - Kafka async processing
    - SQL Server integration
    - Redis support
    - Responsive UI (Material UI)
    - Clean separation of concerns


Author
Name: Sumit Sapkota
Assessment Type: Full Stack Developer 


    

