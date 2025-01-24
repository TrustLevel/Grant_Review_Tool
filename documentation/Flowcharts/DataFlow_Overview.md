flowchart TD
    %% Fund Structure
    Fund[Fund] --> Challenge[Challenge]
    Challenge --> Proposal[Proposal]
    
    %% Reviewer Structure
    Reviewer[ReviewerProfile] --> Preferences[FundPreferences]
    Reviewer --> Stats[ReviewerStats]
    Reviewer --> Missions[ReviewerMissions]
    
    %% Review Process
    Proposal --> Review[Review]
    Review --> TempCheck[TemperatureCheck]
    Review --> CritReview[CriteriaReview]
    
    %% Peer Review Process
    Review --> PeerEval[PeerEvaluation]
    Reviewer --> PeerEval
    
    %% Assignments and Tasks
    Proposal --> Task[Task]
    Task --> Reviewer
    
    %% Stats and Metrics Flow
    Review --> Stats
    PeerEval --> Stats
    
    %% Missions Flow
    Review --> Missions
    PeerEval --> Missions
    
    %% Subgraphs for organization
    subgraph Fund Structure
        Fund
        Challenge
        Proposal
    end
    
    subgraph Reviewer Management
        Reviewer
        Preferences
        Stats
        Missions
    end
    
    subgraph Review Process
        Review
        TempCheck
        CritReview
        PeerEval
    end
    
    classDef core fill:#e2e8f0,stroke:#4338ca,stroke-width:2px
    classDef process fill:#eef2ff,stroke:#4338ca
    classDef stats fill:#f0fdf4,stroke:#22c55e
    
    class Fund,Reviewer,Review core
    class TempCheck,CritReview,PeerEval process
    class Stats,Missions stats