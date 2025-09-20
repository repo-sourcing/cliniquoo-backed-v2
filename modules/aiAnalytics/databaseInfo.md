# Dento Pro - Complete Database Schema Documentation for AI Training

## Overview

Dento Pro is a comprehensive dental practice management system built with Node.js, Express, Sequelize ORM, and MySQL. This documentation provides complete database schema information for AI model training to enable intelligent query processing and data retrieval.

## Database Configuration

- **Database Type**: MySQL
- **ORM**: Sequelize v6.21.4
- **Environment**: Development, Test, Production
- **Features**: Soft deletes (paranoid), timestamps, foreign key constraints

## Core Database Tables and Relationships

### 1. USERS TABLE (`users`)

**Purpose**: Stores dental practitioners/doctors information

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  profilePic VARCHAR(255),
  mobile VARCHAR(255) UNIQUE NOT NULL,
  about TEXT,
  appVersion VARCHAR(255),
  device ENUM('Android', 'IOS'),
  dob DATE NOT NULL,
  gender ENUM('M', 'F', 'O') NOT NULL,
  FcmToken TEXT,
  degree ENUM('BDS', 'MDS') NOT NULL,
  specialization VARCHAR(255), -- Required if degree is MDS
  registrationNumber VARCHAR(255) NOT NULL,
  signature VARCHAR(255),
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP -- Soft delete
);
```

**Business Rules**:

- Email must be unique and valid
- Mobile must be 10 digits
- If degree is 'MDS', specialization is required
- Supports soft deletion
- Gender: M=Male, F=Female, O=Other

### 2. ADMINS TABLE (`admins`)

**Purpose**: System administrators

```sql
CREATE TABLE admins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL, -- Bcrypt hashed
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### 3. CLINICS TABLE (`clinics`)

**Purpose**: Dental clinics owned by users

```sql
CREATE TABLE clinics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  mobile VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  dayOff TEXT, -- JSON array of days ["Sunday", "Monday"]
  scheduleByTime BOOLEAN DEFAULT FALSE,
  timeRanges JSON, -- Array of {start: "HH:mm", end: "HH:mm"}
  userId INT NOT NULL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

**Business Rules**:

- Each user can have multiple clinics
- dayOff stored as JSON array
- timeRanges for time-based scheduling (1-hour slots on hour boundaries)
- Supports soft deletion

### 4. PATIENTS TABLE (`patients`)

**Purpose**: Patient information managed by users

```sql
CREATE TABLE patients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  mobile VARCHAR(255) NOT NULL,
  gender ENUM('M', 'F', 'O') NOT NULL,
  age INT NOT NULL,
  lastVisitedDate DATE,
  isActive BOOLEAN DEFAULT TRUE,
  userId INT NOT NULL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

**Business Rules**:

- Each patient belongs to one user (doctor)
- isActive for patient status management
- lastVistedDate for find last visit of patient
- Supports soft deletion

### 5. TREATMENT PLANS TABLE (`treatmentPlans`)

**Purpose**: Treatment plans for patients at specific clinics

```sql
CREATE TABLE treatmentPlans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  discount FLOAT DEFAULT 0,
  patientId INT NOT NULL,
  clinicId INT NOT NULL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES patients(id),
  FOREIGN KEY (clinicId) REFERENCES clinics(id)
);
```

**Business Rules**:

- TretmentPlan is a group of treatment.
- treatmentPlan have relationship with many treatments

### 6. TREATMENTS TABLE (`treatments`)

**Purpose**: Individual treatments within treatment plans

```sql
CREATE TABLE treatments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  amount FLOAT NOT NULL,
  treatmentPlanId INT NOT NULL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP,
  FOREIGN KEY (treatmentPlanId) REFERENCES treatmentPlans(id)
);
```

**Business Rules**:

- in this table name is provide the treatment name performed to that patient(relation with treatmentPlan nested relation ship with patient)

### 7. TRANSACTIONS TABLE (`transactions`)

**Purpose**: Payment transactions for patients

```sql
CREATE TABLE transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cash INT DEFAULT 0,
  online INT DEFAULT 0,
  amount INT DEFAULT 0, -- Auto-calculated: cash + online
  notes TEXT,
  messageTime TIMESTAMP,
  messageStatus BOOLEAN,
  processedToothNumber TEXT, -- JSON array
  patientId INT NOT NULL,
  clinicId INT NOT NULL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES patients(id),
  FOREIGN KEY (clinicId) REFERENCES clinics(id)
);
```

**Business Rules**:

- amount is auto-calculated as cash + online
- processedToothNumber stored as JSON array
- this amount is a payment that patient provided.
- messageTime and messageStatus for WhatsApp notifications

### 8. PRESCRIPTIONS TABLE (`prescriptions`)

**Purpose**: Medical prescriptions for patients

```sql
CREATE TABLE prescriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  prescription TEXT, -- JSON object with medicine details
  notes VARCHAR(255),
  userId INT NOT NULL,
  patientId INT NOT NULL,
  transactionId INT NOT NULL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (patientId) REFERENCES patients(id),
  FOREIGN KEY (transactionId) REFERENCES transactions(id)
);
```

**Business Rules**:

- Prescription table is a prescription data that user(doctor) provided to particular patient.
- on specific transaction relation with prescription.

### 9. MEDICINES TABLE (`medicines`)

**Purpose**: Medicine database for prescriptions

```sql
CREATE TABLE medicines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  qty INT,
  frequency TEXT, -- JSON object
  days INT,
  userId INT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### 10. VISITORS TABLE (`visitors`)

**Purpose**: Patient appointments and visits

```sql
CREATE TABLE visitors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL,
  timeSlot JSON, -- [start, end] time array
  isCanceled BOOLEAN DEFAULT FALSE,
  isVisited BOOLEAN DEFAULT FALSE,
  isSchedule BOOLEAN DEFAULT FALSE,
  clinicId INT NOT NULL,
  patientId INT NOT NULL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  FOREIGN KEY (clinicId) REFERENCES clinics(id),
  FOREIGN KEY (patientId) REFERENCES patients(id)
);
```

**Business Rules**:

- timeSlot: 1-hour slots on hour boundaries [start, end]


### 12. MEDICAL HISTORY TABLE (`medicalHistories`)

**Purpose**: Patient medical history records

```sql
CREATE TABLE medicalHistories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(255),
  patientId INT NOT NULL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES patients(id)
);
```

### 13. NOTIFICATIONS TABLE (`notifications`)

**Purpose**: Push notifications for users

```sql
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  click_action VARCHAR(255),
  userId INT NOT NULL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### 14. TEMPLATES TABLE (`templates`)

**Purpose**: Prescription templates for reuse

```sql
CREATE TABLE templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  notes VARCHAR(255),
  prescription TEXT, -- JSON object
  userId INT NOT NULL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### 15. SUBSCRIPTIONS TABLE (`subscriptions`)

**Purpose**: Available subscription plans

```sql
CREATE TABLE subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  day INT NOT NULL, -- Duration in days
  price INT NOT NULL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP
);
```

### 16. USER SUBSCRIPTIONS TABLE (`userSubscriptions`)

**Purpose**: User's active subscriptions

```sql
CREATE TABLE userSubscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL, -- Subscription start date
  userId INT NOT NULL,
  subscriptionId INT NOT NULL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (subscriptionId) REFERENCES subscriptions(id)
);
```

### 17. USER TRANSACTIONS TABLE (`userTransactions`)

**Purpose**: Payment transactions for subscriptions

```sql
CREATE TABLE userTransactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  amount INT NOT NULL,
  status VARCHAR(255) NOT NULL, -- Payment status
  userId INT NOT NULL,
  subscriptionId INT NOT NULL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (subscriptionId) REFERENCES subscriptions(id)
);
```

**Business Rules**:

- userTransactions table only include the transaction of subscription

### 18. FREQUENTLY USED MEDICINES TABLE (`frequentlyUsedMedicines`)

**Purpose**: Track frequently prescribed medicines by users

```sql
CREATE TABLE frequentlyUsedMedicines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  count INT DEFAULT 0,
  userId INT NOT NULL,
  medicineId INT NOT NULL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (medicineId) REFERENCES medicines(id)
);
```

### 19. GENERAL COMPLAINTS TABLE (`GeneralComplains`)

**Purpose**: Predefined dental complaints

```sql
CREATE TABLE GeneralComplains (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(255),
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP
);
```

### 20. GENERAL PROCEDURES TABLE (`generalProcedures`)

**Purpose**: Predefined dental procedures

```sql
CREATE TABLE generalProcedures (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(255),
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP
);
```

### 21. GENERAL TREATMENTS TABLE (`generalTreatments`)

**Purpose**: Predefined dental treatments

```sql
CREATE TABLE generalTreatments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(255),
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP
);
```

### 24. CONFIG TABLE (`configs`)

**Purpose**: Application configuration settings

```sql
CREATE TABLE configs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  appInMaintenance BOOLEAN DEFAULT FALSE,
  androidVersionCode VARCHAR(255) DEFAULT '1.0.0',
  iosVersionCode VARCHAR(255) DEFAULT '1.0.0',
  forceUpdate BOOLEAN DEFAULT FALSE,
  softUpdate BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### 25. LOGS TABLE (`logs`)

**Purpose**: Application error and request logging

```sql
CREATE TABLE logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  method VARCHAR(255) NOT NULL,
  url VARCHAR(255) NOT NULL,
  payload TEXT, -- JSON object
  statusCode VARCHAR(255) NOT NULL,
  message VARCHAR(255) NOT NULL,
  stack TEXT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

## Important rule

in the table if deletedAt column is present then always add the condition in query like deletedAt null, it means where deletedAt is null that data only considered.

## Key Relationships and Foreign Keys

### Primary Relationships:

1. **User → Clinics**: One-to-Many (User can have multiple clinics)
2. **User → Patients**: One-to-Many (User manages multiple patients)
3. **Patient → TreatmentPlans**: One-to-Many (Patient can have multiple treatment plans)
4. **TreatmentPlan → Treatments**: One-to-Many (Treatment plan contains multiple treatments)
5. **Patient → Transactions**: One-to-Many (Patient can have multiple payment transactions)
6. **Patient → Visitors**: One-to-Many (Patient can have multiple appointments)
7. **Clinic → Visitors**: One-to-Many (Clinic can have multiple appointments)
8. **Transaction → Prescriptions**: One-to-Many (Transaction can have multiple prescriptions)
9. **User → Medicines**: One-to-Many (User can create custom medicines)
10. **User → Templates**: One-to-Many (User can create prescription templates)

### Complex Relationships:

- **TreatmentPlan**: Links Patient and Clinic (Many-to-Many through TreatmentPlan)
- **Transaction**: Links Patient and Clinic for payments
- **Visitor**: Links Patient and Clinic for appointments
- **Prescription**: Links User, Patient, and Transaction

## JSON Data Structures

### 1. Prescription JSON Structure:

```json
{
  "medicines": [
    {
      "id": 1,
      "name": "Amoxicillin",
      "dosage": "500mg",
      "frequency": {
        "morning": true,
        "afternoon": false,
        "evening": true
      },
      "duration": 7,
      "instructions": "Take after meals"
    }
  ],
  "advice": "Maintain oral hygiene",
  "followUp": "2024-01-15"
}
```

### 2. Medicine Frequency JSON Structure:

```json
{
  "morning": true,
  "afternoon": false,
  "evening": true,
  "beforeMeal": true,
  "afterMeal": false
}
```

### 3. Clinic dayOff JSON Structure:

```json
["Sunday", "Monday"]
```

### 4. Clinic timeRanges JSON Structure:

```json
[
  { "start": "09:00", "end": "10:00" },
  { "start": "14:00", "end": "15:00" },
  { "start": "16:00", "end": "17:00" }
]
```

### 5. Transaction processedToothNumber JSON Structure:

```json
[11, 12, 21, 22, 31, 32]
```

### 6. Visitor timeSlot JSON Structure:

```json
["10:00", "11:00"]
```

### 7. PatientBill billData JSON Structure:

```json
{
  "treatments": [
    {
      "name": "Root Canal",
      "amount": 5000,
      "quantity": 1
    }
  ],
  "totalAmount": 5000,
  "discount": 500,
  "finalAmount": 4500,
  "paymentMode": "cash",
  "clinicDetails": {
    "name": "Smile Dental Clinic",
    "address": "123 Main Street"
  }
}
```

## Business Logic and Calculations

### 1. Patient Financial Calculations:

```sql
-- Total Treatment Amount for a Patient
SELECT SUM(t.amount) as totalTreatmentAmount
FROM treatmentPlans tp
JOIN treatments t ON t.treatmentPlanId = tp.id
WHERE tp.patientId = ? AND tp.deletedAt IS NULL AND t.deletedAt IS NULL;

-- Total Payments Received from Patient
SELECT SUM(amount) as totalPayments
FROM transactions
WHERE patientId = ? AND deletedAt IS NULL;

-- Total Discount Given to Patient
SELECT SUM(discount) as totalDiscount
FROM treatmentPlans
WHERE patientId = ? AND deletedAt IS NULL;

Pending Amount Calculation
Pending = Total Treatment Amount - Total Payments - Total Discount
```

### 2. Appointment Management:

- Visitors table tracks all appointments
- isCanceled: Appointment was canceled
- isVisited: Patient actually visited
- isSchedule: Appointment is scheduled for future
- timeSlot: Specific time slot for appointment (1-hour slots)

### 3. Prescription Workflow:

1. Doctor creates prescription during transaction
2. Prescription linked to specific transaction and patient
3. Medicine frequency stored as JSON for flexible dosing
4. Templates allow reusing common prescriptions

## API Endpoints and Common Queries

### Patient Management:

- `GET /patients` - Get all patients for a user
- `GET /patients/:id` - Get patient details with financial summary
- `POST /patients` - Create new patient
- `PUT /patients/:id` - Update patient information
- `DELETE /patients/:id` - Soft delete patient

### Treatment Management:

- `GET /treatment-plans` - Get treatment plans for patient
- `POST /treatments` - Add treatment to plan
- `PUT /treatments/:id` - Update treatment details

### Transaction Management:

- `POST /transactions` - Record payment
- `GET /transactions` - Get payment history
- Payment automatically calculates: amount = cash + online

### Appointment Management:

- `POST /visitors` - Schedule appointment
- `GET /visitors` - Get appointments by date/clinic
- `PUT /visitors/:id` - Update appointment status

## Validation Rules

### User Validation:

- Email: Must be valid email format and unique
- Mobile: Must be exactly 10 digits
- Degree: Must be 'BDS' or 'MDS'
- Specialization: Required if degree is 'MDS'
- Gender: Must be 'M', 'F', or 'O'

### Patient Validation:

- Name: Required
- Mobile: Required (10 digits)
- Age: Required integer
- Gender: Must be 'M', 'F', or 'O'

### Treatment Validation:

- Name: Required
- Amount: Required positive number

### Transaction Validation:

- Either cash or online amount must be provided
- Amount auto-calculated from cash + online

This comprehensive documentation provides all necessary information for AI model training to understand the Dento Pro database schema, relationships, business logic, and query patterns. The AI can use this knowledge to intelligently process user queries and retrieve relevant data from the database.
