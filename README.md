# BiVerify - QR-Based Compliance Verification System

![BiVerify Banner](https://via.placeholder.com/1200x400?text=BiVerify+Compliance+Verification+System)

## Overview

**BiVerify** is a multi-tenant B2B compliance verification platform designed to simplify and secure the process of verifying service providers, managing compliance documents, and maintaining transparent business relationships.

The system enables organizations (**Clients**) to connect with verified service providers (**Providers**), request services, manage compliance records, and perform instant verification through QR-based authentication.

BiVerify provides a centralized platform for compliance management with role-based access control, audit tracking, document management, and secure verification workflows.

---

## Problem Statement

Organizations often struggle with:

* Manual compliance verification processes
* Difficulty managing service provider credentials
* Lack of transparency in business verification
* Inefficient document tracking
* Limited audit visibility

BiVerify addresses these challenges by providing a digital compliance ecosystem with automated verification and secure record management.

---

# Key Features

## Multi-Tenant Architecture

* Separate workspaces for Clients and Providers
* Organization-based data isolation
* Secure role-based workflows

---

## QR-Based Compliance Verification

* Generate unique QR codes for verification
* Instantly verify provider compliance status
* Reduce manual verification efforts

---

## Role-Based Access Control (RBAC)

Supported user roles:

* Admin
* Client Organization
* Client Staff
* Service Provider
* Provider Staff
* Compliance Officer

Each role has controlled access according to responsibilities.

---

## Compliance Document Management

* Upload and manage compliance documents
* Track verification status
* Maintain compliance records
* Secure document handling

---

## Service Management Workflow

* Service request creation
* Provider approval process
* Service booking management
* Request tracking

---

## Audit Logging

* Track important system activities
* Maintain transparency
* Monitor user actions

---

# System Architecture

```
                    Users
                      |
                      |
              React Frontend
                      |
                      |
              REST API Layer
                      |
          -----------------------
          |                     |
     Flask Backend          Authentication
          |
          |
       MongoDB Database
```

---

# Technology Stack

## Frontend

* React.js
* Vite
* JavaScript (ES6+)
* CSS3
* React Router
* Axios

## Backend

* Python
* Flask
* REST APIs
* JWT Authentication

## Database

* MongoDB Atlas

## Security

* JWT Authentication
* Password Hashing
* Role-Based Access Control
* Protected Routes

## Development Tools

* Git & GitHub
* VS Code
* Postman
* MongoDB Compass

---

# Project Structure

```
BiVerify-ComplianceSystem/

│
├── client/                 # React Frontend
│   ├── src/
│   ├── components/
│   ├── pages/
│   └── api/
│
├── server_python/          # Flask Backend
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.py
│   └── config.py
│
├── README.md
└── .gitignore
```

---

# Installation & Setup

## Prerequisites

Make sure you have installed:

* Node.js
* Python 3.x
* MongoDB

---

# Frontend Setup

Navigate to client folder:

```bash
cd client
```

Install dependencies:

```bash
npm install
```

Start React application:

```bash
npm run dev
```

Frontend will run on:

```
http://localhost:5173
```

---

# Backend Setup

Navigate to backend folder:

```bash
cd server_python
```

Create virtual environment:

```bash
python -m venv venv
```

Activate environment:

Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run Flask server:

```bash
python app.py
```

Backend will run on:

```
http://localhost:5000
```

---

# Environment Variables

Create `.env` file inside `server_python`:

```
MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_secret_key

EMAIL_USER=your_email

EMAIL_PASSWORD=your_password
```

---

# API Modules

## Authentication APIs

* User Registration
* Login
* JWT Authentication
* Password Recovery

## Client APIs

* Dashboard
* Service Requests
* Compliance Vault
* Team Management

## Provider APIs

* Provider Dashboard
* Document Management
* Incoming Requests

## Verification APIs

* QR Verification
* Compliance Status Checking

---

# Screenshots

Add application screenshots here:

```
docs/
 └── screenshots/
       ├── landing-page.png
       ├── login.png
       ├── dashboard.png
       └── qr-verification.png
```

---

# Future Enhancements

* Mobile application support
* AI-based document verification
* Advanced analytics dashboard
* Cloud deployment
* Automated compliance reminders

---

# Team

Developed as a Final Year Project (FYP)

**Project Name:** BiVerify
**Category:** Full Stack Web Application
**Architecture:** Multi-Tenant B2B Platform

---

# Contributors

* Beenish Ishaq
* Team Members

---

# License

This project is developed for educational and demonstration purposes.
