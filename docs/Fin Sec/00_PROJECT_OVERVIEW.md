# 00_PROJECT_OVERVIEW.md

Version: 1.0 (Reverse Engineered)
Status: In Progress
Document Type: AI-First Technical Specification
Target Audience:
- Software Engineers
- Solution Architects
- Technical Leads
- AI Coding Agents
- System Integrators

---

# 1. Executive Summary

## Project Name

Invoice Management & Official Billing System

(Project name inferred from source code.)

---

## Project Type

Enterprise Desktop Business Application

---

## Primary Purpose

This application is an internal enterprise billing platform used to transform operational travel-service data into official financial documents while enforcing company approval policies, accounting rules, document numbering regulations, and archival requirements.

Unlike a traditional invoice generator, the system manages the entire lifecycle of financial document production.

It acts as the operational bridge between:

- Operational service data
- Financial departments
- Company management
- Accounting
- Official document generation
- Historical record keeping

---

# 2. Core Business Objective

The software exists to solve one business problem:

> Produce legally valid, internally approved, uniquely numbered financial documents from operational travel data.

This includes:

- Importing service data
- Managing companies (payers)
- Managing service categories
- Calculating balances
- Managing credits/debts
- Producing invoices
- Producing official letters
- Approval workflows
- Document generation
- Permanent archival

---

# 3. Business Domain

The application belongs primarily to:

Enterprise Resource Planning (ERP)

More specifically:

Financial Operations

with specialized support for

Travel Industry Billing.

The software combines characteristics of:

- ERP
- Billing System
- Invoice Management System
- Approval Management System
- Document Generation Platform
- Accounting Support Tool

---

# 4. Intended Users

The code indicates several distinct user groups.

## Billing Operator

Responsibilities

- Import operational data
- Prepare invoices
- Review calculations
- Submit approval requests

---

## Financial Staff

Responsibilities

- Review balances
- Manage credits
- Verify payer information
- Generate reports

---

## Approver / Manager

Responsibilities

- Review invoice requests
- Approve
- Reject
- Return for correction

---

## Administrator

Responsibilities

- Manage users
- Manage permissions
- Configure templates
- Configure numbering
- Manage companies
- Maintain application settings

---

# 5. High-Level System Responsibilities

The application performs the following major responsibilities.

## Company Management

Stores organizations that receive invoices.

Responsibilities include

- creation
- editing
- categorization
- hierarchy management
- financial metadata

---

## Invoice Processing

Transforms operational data into structured invoices.

Includes

- validation
- grouping
- calculations
- formatting
- persistence

---

## Approval Workflow

Ensures invoices cannot become official before managerial approval.

Approval represents a business gate rather than a UI action.

---

## Credit Management

Maintains financial balances.

Supports

- credits
- debts
- adjustments
- historical balances

---

## Official Letter Management

Produces official correspondence associated with invoices.

Includes globally unique numbering.

---

## Document Generation

Produces multiple output formats.

Expected outputs include

- DOCX
- HTML
- PDF
- Excel

---

## Historical Archive

Every finalized operation becomes reproducible from stored information.

---

# 6. High-Level Architecture

The application follows a monolithic desktop architecture.

```

+------------------------------------------------------+
|                 Desktop Application                  |
|                (CustomTkinter UI)                    |
+---------------------------+--------------------------+
                            |
                            v
+------------------------------------------------------+
|                Business Logic Layer                  |
|                                                      |
| Invoice Engine                                       |
| Approval Engine                                      |
| Payment Engine                                       |
| Company Manager                                      |
| Credit Manager                                       |
| Letter Number Manager                                |
| Template Manager                                     |
+---------------------------+--------------------------+
                            |
                            v
+------------------------------------------------------+
|                Persistence Layer                     |
|                                                      |
| SQL Server                                           |
+---------------------------+--------------------------+
                            |
                            v
+------------------------------------------------------+
|           Final File Generation Service              |
|                                                      |
| HTML Rendering                                       |
| DOCX Templates                                       |
| PDF Generation                                       |
| File Storage                                         |
+------------------------------------------------------+

```

---

# 7. Architectural Style

Current Architecture

Monolithic Desktop Application

Characteristics

✓ Business logic embedded inside UI layer

✓ Database access distributed across application

✓ Shared state

✓ Service helper modules

✓ Local filesystem usage

✓ SQL Server persistence

---

# 8. Major Business Domains

The following bounded contexts have already been identified.

## Authentication

Responsible for

- login
- session
- identity

---

## Authorization

Role-based access control.

Controls access to:

- UI
- invoices
- approvals
- administration

---

## Company Domain

Maintains payer organizations.

Includes

- hierarchy
- metadata
- accounting information

---

## Invoice Domain

Core business domain.

Responsible for

- invoice construction
- validation
- calculations
- lifecycle

---

## Approval Domain

Responsible for

- request creation
- approval
- rejection
- auditability

---

## Accounting Domain

Responsible for

- credits
- balances
- financial adjustments

---

## Letter Domain

Responsible for

- official numbering
- uniqueness
- issuance

---

## Template Domain

Responsible for

- Word templates
- HTML templates
- placeholder substitution

---

## Output Domain

Responsible for

- DOCX
- PDF
- HTML
- Excel

---

# 9. Core Business Workflow

The primary workflow recovered so far is:

```

Operational Data

↓

Validation

↓

Transformation

↓

Invoice Draft

↓

Financial Calculations

↓

Approval Submission

↓

Manager Review

↓

Approved

↓

Official Number Allocation

↓

Document Generation

↓

Archive

↓

Historical Record

```

---

# 10. Key Architectural Characteristics

Strengths

- Rich business functionality
- End-to-end workflow
- Integrated document production
- Internal approval system
- Persistent historical records

Potential Weaknesses

- Monolithic design
- Tight coupling
- Business logic mixed with presentation
- Difficult unit testing
- High maintenance complexity

These observations will be validated during deeper analysis.

---

# 11. Reverse Engineering Goals

This documentation project aims to recover:

- Complete business specification
- Functional specification
- Technical specification
- Database schema
- Domain model
- Business rules
- State machines
- Data flows
- Sequence diagrams
- File formats
- Approval lifecycle
- Invoice lifecycle
- Storage strategy
- Permission model

without relying on original developers.

---

# 12. Documentation Philosophy

This documentation is intentionally AI-first.

Every chapter should allow an AI coding agent to understand:

- Why the feature exists
- What problem it solves
- Which modules own it
- Which data it consumes
- Which data it produces
- Which business rules must never change

The implementation is treated as the source of truth from which the original software specification is reconstructed.

---

End of Document