flowchart TD
    subgraph Client["Desktop Client (Invoice_app.py)"]
        A[User Login] --> B[Select Payer & Date]
        B --> C{Has can_issue?}
        C -->|Yes| D[Generate Letter Number via /reserve-letter]
        C -->|No| E[Generate letter number via /reserve-letter for preview]
        D --> F[Upload Excel Files]
        E --> F
        F --> G[Edit Service/Flight/Hotel Data]
        G --> H[Select Period Range]
        H --> I[Review Summary]
        I --> J{Action}
        J -->|Direct Generation| K[Generate Directly]
        J -->|Submit for Approval| L[Submit Request]
    end

    subgraph Server["Flask Service (final_file_service.py)"]
        D --> M[/reserve-letter: allocates number]
        M --> N[Return letter_number]
        L --> O[Store in approval_requests table]
        O --> P[status: pending]
    end

    subgraph Approver["Approver (can_approve)"]
        Q[View Pending Requests] --> R[Approve or Reject]
        R -->|Approve| S[Call /generate with request_id]
        R -->|Reject| T[Call /release-letter and set status rejected]
    end

    S --> U[generate_files_for_request]
    U --> V[Create Excel, Word, PDF]
    V --> W[Save files to disk & final_files table]
    W --> X[Update status to approved]

    subgraph Download["User Download"]
        Y[View History or Workflow] --> Z[Click Download / Regenerate]
        Z --> AA[Call /regenerate or /download/<file_id>]
        AA --> AB[Return file]
    end

    K --> AC[Direct Generation: same as U but without approval]
    AC --> AD[Save to history & credits]
    AD --> AE[Return files to user]

    %% Styles
    classDef client fill:#f9f,stroke:#333,stroke-width:2px;
    classDef server fill:#bbf,stroke:#333,stroke-width:2px;
    classDef approver fill:#bfb,stroke:#333,stroke-width:2px;
    classDef download fill:#fbb,stroke:#333,stroke-width:2px;

    class A,B,C,D,E,F,G,H,I,J,K,L client;
    class M,N,O,P server;
    class Q,R,S,T approver;
    class U,V,W,X server;
    class Y,Z,AA,AB download;

    Explanation of the Flow
1. User Login & Initial Steps
The user logs in (authentication against SQL Server).

They select a payer (client company), a letter number (reserved via the Flask service), and a date.

2. Data Entry & Editing
Excel files are uploaded; the system auto-detects the type (flight, hotel, or service).

The user can add/edit/delete rows in a tabular interface (services, flights, hotels).

A period (date range) is selected using a Persian calendar.

3. Final Action
If the user has can_issue permission (direct generation):

They click "Generate Directly".

The system (client-side) calls the Flask service's /reserve-letter for each service package (if multiple, reserves multiple numbers).

Files are generated locally (Excel, Word, PDF) and saved to disk; history is recorded.

If the user has can_submit permission (submit for approval):

They click "Submit for Approval".

The request is saved in the approval_requests table with status pending.

The reserved letter number is held (not yet consumed).

4. Approval Process
An approver (user with can_approve) sees pending requests in the Workflow tab.

They can view details.

Approve: Calls /generate on the Flask service. The service:

Generates Excel, Word, and PDF files for each service package.

Saves them to disk and as BLOBs in final_files.

Updates request status to approved.

Reject: Calls /release-letter to free the reserved number, updates status to rejected with a reason.

5. Download
Once approved, the original requester (or any user) can:

Go to the History tab → find the letter number → click "Download" (which calls /regenerate to rebuild if needed, then serves the file).

Or go to the Workflow tab → for approved requests → click "Generate Final Files" (which downloads the existing files).

Key API Interactions (Client ↔ Flask)
Client Action	Flask Endpoint
Reserve a letter number	/reserve-letter (POST)
Generate final files after approval	/generate (POST)
Regenerate and download a file	/regenerate (POST) + /download/<file_id> (GET)
Release a reserved number (on rejection)	/release-letter (POST)
