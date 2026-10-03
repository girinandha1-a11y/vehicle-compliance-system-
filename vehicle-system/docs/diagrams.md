# System Diagrams

Rendered with Mermaid — view in any Mermaid-compatible viewer (GitHub, VS Code
extension, mermaid.live) or paste into the Mermaid Live Editor.

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ NOTIFICATIONS : receives
    VEHICLES ||--o{ FINES : has
    VEHICLES ||--o{ CASES : has
    VEHICLES ||--|| COMPLIANCE : has

    USERS {
        int user_id PK
        string name
        string email
        string password
        string role
    }
    VEHICLES {
        int vehicle_id PK
        string registration_number
        string owner_name
        string vehicle_type
        date registration_date
    }
    FINES {
        int fine_id PK
        int vehicle_id FK
        string violation_type
        decimal amount
        string status
        date issued_date
    }
    CASES {
        int case_id PK
        int vehicle_id FK
        string case_type
        string description
        date hearing_date
        string status
    }
    COMPLIANCE {
        int compliance_id PK
        int vehicle_id FK
        date insurance_expiry
        date pollution_expiry
        string tax_status
        date fitness_expiry
    }
    NOTIFICATIONS {
        int notification_id PK
        int user_id FK
        string message
        string status
        datetime created_at
    }
```

## 2. System Architecture Diagram

```mermaid
flowchart LR
    subgraph Client
        A[React SPA<br/>Tailwind + Recharts]
    end
    subgraph API["Express REST API"]
        B[Auth Routes]
        C[Vehicle Routes]
        D[Fine / Case / Compliance Routes]
        E[Analytics Routes]
        F[JWT Middleware]
    end
    subgraph AI["OCR Module"]
        G[ocrService.js dispatcher]
        H[plate_reader.py<br/>OpenCV + EasyOCR]
    end
    I[(Database<br/>SQLite demo / MySQL prod)]

    A -- Axios / REST + JWT --> F
    F --> B & C & D & E
    C -- image upload --> G
    G -- OCR_MODE=python --> H
    B & C & D & E --> I
```

## 3. Use Case Diagram

```mermaid
flowchart TB
    User((Registered User))
    Admin((Admin))

    subgraph System["Vehicle Compliance System"]
        UC1[Register / Login]
        UC2[Search Vehicle by Reg. Number]
        UC3[Upload Image for Plate Recognition]
        UC4[View Fines]
        UC5[View Cases]
        UC6[View Compliance Status]
        UC7[View Notifications]
        UC8[View Analytics Dashboard]
        UC9[Manage Fines/Cases/Compliance]
        UC10[Manage Vehicle Records]
    end

    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8

    Admin --> UC1
    Admin --> UC8
    Admin --> UC9
    Admin --> UC10
```

## 4. Sequence Diagram — Image-Based Vehicle Search

```mermaid
sequenceDiagram
    actor U as User
    participant FE as React Frontend
    participant API as Express API
    participant OCR as OCR Service
    participant DB as Database

    U->>FE: Upload vehicle image
    FE->>API: POST /api/vehicle/upload (multipart)
    API->>OCR: extractPlate(imagePath)
    OCR-->>API: { plate, confidence }
    API->>DB: SELECT * FROM vehicles WHERE registration_number = ?
    DB-->>API: vehicle row
    API->>DB: SELECT * FROM compliance WHERE vehicle_id = ?
    DB-->>API: compliance row
    API-->>FE: { detected_plate, confidence, vehicle }
    FE-->>U: Display vehicle card with compliance status
```
