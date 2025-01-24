flowchart TD
    Start([Start]) --> WalletConnect[Connect Wallet]
    WalletConnect --> BasicInfo[Basic Information]
    
    %% Step 1: Basic Information
    subgraph BASIC_INFO[Basic Information Step]
        BasicInfo --> PersonalInfo[Name & Contact]
        PersonalInfo --> Experience[Catalyst Experience]
        Experience --> Guidelines[Accept Guidelines]
    end
    
    %% Step 2: Expertise
    subgraph EXPERTISE[Expertise Step]
        Guidelines --> MainExpertise[Primary Expertise Area]
        MainExpertise --> ExpertLevel[Expertise Level]
        ExpertLevel --> DetailedSkills[Detailed Skills]
    end
    
    %% Step 3: Validation
    subgraph VALIDATION[Validation Step]
        DetailedSkills --> Links[Professional Links]
        Links --> CatalystExp[Previous Catalyst Experience]
        CatalystExp --> AdminReview{Admin Review}
    end

    %% Decision & Completion
    AdminReview -->|Approved| SetPreferences[Set Fund Preferences]
    AdminReview -->|Rejected| Feedback[Provide Feedback]
    Feedback --> DetailedSkills
    
    SetPreferences --> Complete[Complete Onboarding]
    Complete --> Dashboard([Dashboard Access])

    %% States for reviewer
    Pending[Reviewer Status: PENDING]
    Inactive[Reviewer Status: INACTIVE]
    Approved[Reviewer Status: APPROVED]

    %% State connections
    WalletConnect --> Inactive
    AdminReview -->|Waiting| Pending
    AdminReview -->|Approved| Approved

    classDef start fill:#4338ca,stroke:#4338ca,color:#fff
    classDef process fill:#eef2ff,stroke:#4338ca
    classDef state fill:#f0fdf4,stroke:#22c55e
    classDef decision fill:#fef2f2,stroke:#991b1b,color:#991b1b

    class Start,Dashboard start
    class BASIC_INFO,EXPERTISE,VALIDATION process
    class Pending,Inactive,Approved state
    class AdminReview decision