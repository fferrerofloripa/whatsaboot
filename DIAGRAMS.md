# 📊 WhatsaBoot - Diagramas de Arquitectura

Este documento contiene todos los diagramas visuales de la arquitectura de WhatsaBoot.

## 🏗️ Arquitectura del Sistema

### Vista General de Componentes

```mermaid
graph TB
    subgraph "🌐 Frontend Layer"
        A[👤 Browser Client] --> B[📄 EJS Templates]
        B --> C[🎨 Tailwind CSS]
        A --> D[⚡ Socket.IO Client]
        A --> E[📱 JavaScript Functions]
    end
    
    subgraph "⚙️ Backend Layer"
        F[🚀 Express.js Server] --> G[🛤️ Routes Layer]
        F --> H[🛡️ Middleware Layer]
        F --> I[🔄 Socket.IO Server]
        
        G --> J[🔐 Auth Routes]
        G --> K[📊 Dashboard Routes]
        G --> L[👑 Admin Routes]
        G --> M[🤖 Bot API Routes]
        G --> N[📋 Logs Routes]
        
        H --> O[🔑 Authentication]
        H --> P[🛡️ Authorization]
        H --> Q[💾 Session Management]
    end
    
    subgraph "🔧 Services Layer"
        R[📱 WhatsApp Service] --> S[💬 whatsapp-web.js]
        T[🤖 AI Service] --> U[🧠 DeepSeek API]
        V[📝 Logger Service] --> W[📋 Winston]
    end
    
    subgraph "🗄️ Data Layer"
        X[🔗 Sequelize ORM] --> Y[💾 SQLite Database]
        Y --> Z[👤 User Model]
        Y --> AA[📱 WhatsApp Instance Model]
        Y --> BB[🤖 Auto Response Model]
    end
    
    subgraph "🔐 Authentication"
        CC[🎫 Passport.js] --> DD[🔵 Google OAuth 2.0]
        CC --> EE[💾 Session Store]
    end
    
    F --> R
    F --> T
    F --> V
    F --> X
    F --> CC
    
    style A fill:#e3f2fd
    style F fill:#f3e5f5
    style R fill:#e8f5e8
    style X fill:#fff3e0
    style CC fill:#fce4ec
```

## 🔄 Flujos de Datos

### Flujo Principal de Usuario

```mermaid
flowchart TD
    Start([👤 Usuario Inicia Sesión]) --> Auth{🔐 Google OAuth}
    Auth -->|✅ Exitoso| Dashboard[📊 Dashboard Principal]
    Auth -->|❌ Fallo| Login[🔑 Página de Login]
    Login --> Auth
    
    Dashboard --> CreateInstance[📱 Crear Instancia WhatsApp]
    CreateInstance --> QRGen[📲 Generar QR Code]
    QRGen --> SocketEmit[⚡ Emitir QR via Socket.IO]
    SocketEmit --> DisplayQR[📱 Mostrar QR en Frontend]
    
    DisplayQR --> ScanQR{📷 Usuario Escanea QR?}
    ScanQR -->|✅ Sí| Connected[🟢 WhatsApp Conectado]
    ScanQR -->|❌ No| NewQR[🔄 Generar Nuevo QR]
    NewQR --> DisplayQR
    
    Connected --> ReceiveMsg[📨 Recibir Mensaje]
    ReceiveMsg --> CheckAuto{🤖 Hay Respuesta Automática?}
    CheckAuto -->|✅ Sí| SendAuto[📤 Enviar Respuesta Automática]
    CheckAuto -->|❌ No| CheckAI{🧠 Activar IA?}
    
    CheckAI -->|✅ Sí| SendAI[🤖 Respuesta con IA]
    CheckAI -->|❌ No| NoResponse[⏸️ No Responder]
    
    SendAuto --> LogAction[📋 Log de Acción]
    SendAI --> LogAction
    LogAction --> End([🏁 Fin del Flujo])
    
    Dashboard --> ManageResponses[⚙️ Gestionar Respuestas]
    ManageResponses --> UpdateDB[💾 Actualizar Base de Datos]
    UpdateDB --> RefreshUI[🔄 Actualizar UI]
    
    style Start fill:#e8f5e8
    style Auth fill:#fff3e0
    style Dashboard fill:#e3f2fd
    style Connected fill:#c8e6c9
    style SendAuto fill:#bbdefb
    style SendAI fill:#f8bbd9
    style LogAction fill:#d7ccc8
```

### Flujo de Creación de Instancia WhatsApp

```mermaid
sequenceDiagram
    participant U as 👤 Usuario
    participant B as 🌐 Browser
    participant E as ⚙️ Express Server
    participant W as 📱 WhatsApp Service
    participant WW as 💬 whatsapp-web.js
    participant S as ⚡ Socket.IO
    participant DB as 🗄️ Database
    
    Note over U,DB: Proceso de Creación de Instancia
    
    U->>B: Click "Nueva Instancia"
    B->>E: POST /api/bot/instances
    E->>DB: Crear registro instancia
    E->>W: createInstance()
    W->>WW: Inicializar cliente
    WW->>W: Evento 'qr'
    W->>DB: Guardar QR code
    W->>S: Emit 'qr_generated'
    S->>B: QR code data
    B->>U: Mostrar QR para escanear
    
    Note over U,DB: Conexión WhatsApp
    
    U->>U: Escanea QR con WhatsApp
    WW->>W: Evento 'ready'
    W->>DB: Actualizar status='connected'
    W->>S: Emit 'client_ready'
    S->>B: Cliente conectado
    B->>U: Mostrar "Conectado"
    
    Note over U,DB: Mensaje Automático
    
    U->>WW: Envía mensaje a WhatsApp
    WW->>W: Evento 'message'
    W->>DB: Buscar AutoResponse
    DB->>W: Respuesta encontrada
    W->>WW: Enviar respuesta
    WW->>U: Respuesta automática
```

## 🗄️ Modelo de Base de Datos

### Diagrama Entidad-Relación

```mermaid
erDiagram
    USERS {
        int id PK "🔑 Primary Key"
        string googleId "🔵 Google ID único"
        string email "📧 Email del usuario"
        string displayName "👤 Nombre mostrado"
        enum role "👑 admin/user"
        datetime createdAt "📅 Fecha creación"
        datetime updatedAt "🔄 Última actualización"
    }
    
    WHATSAPP_INSTANCES {
        int id PK "🔑 Primary Key"
        string numberName "📱 Nombre del número"
        enum status "🔄 connected/disconnected/qr_pending"
        text qrCode "📲 Código QR actual"
        string phoneNumber "📞 Número de teléfono"
        text sessionData "💾 Datos de sesión WhatsApp"
        boolean isActive "✅ Activo/Inactivo"
        text errorMessage "❌ Mensajes de error"
        json settings "⚙️ Configuraciones JSON"
        datetime lastConnection "🕐 Última conexión"
        int userId FK "🔗 Foreign Key a Users"
        datetime createdAt "📅 Fecha creación"
        datetime updatedAt "🔄 Última actualización"
    }
    
    AUTO_RESPONSES {
        int id PK "🔑 Primary Key"
        string keyword "🔍 Palabra clave trigger"
        text responseMessage "💬 Mensaje de respuesta"
        boolean isActive "✅ Activo/Inactivo"
        enum matchType "🎯 exact/contains/starts/ends"
        boolean caseSensitive "📝 Sensible a mayúsculas"
        int priority "📊 Prioridad (1=alta)"
        int usageCount "📈 Contador de uso"
        datetime lastUsed "🕐 Última vez usado"
        int whatsappInstanceId FK "🔗 Foreign Key a WhatsApp Instances"
        datetime createdAt "📅 Fecha creación"
        datetime updatedAt "🔄 Última actualización"
    }
    
    USERS ||--o{ WHATSAPP_INSTANCES : "👤 Un usuario puede tener múltiples instancias"
    WHATSAPP_INSTANCES ||--o{ AUTO_RESPONSES : "📱 Una instancia puede tener múltiples respuestas"
```

## 🔧 Arquitectura de Servicios

### Diagrama de Servicios

```mermaid
graph LR
    subgraph "📱 WhatsApp Service"
        WS[WhatsApp Service] --> WC[Client Manager]
        WS --> QR[QR Generator]
        WS --> MH[Message Handler]
        WS --> AR[Auto Response]
    end
    
    subgraph "🤖 AI Service"
        AI[AI Service] --> DS[DeepSeek API]
        AI --> CT[Context Manager]
        AI --> FB[Fallback Logic]
    end
    
    subgraph "📝 Logger Service"
        LS[Logger Service] --> FL[File Logger]
        LS --> CL[Console Logger]
        LS --> RL[Real-time Logs]
    end
    
    WS --> AI
    WS --> LS
    AI --> LS
    
    style WS fill:#e8f5e8
    style AI fill:#f8bbd9
    style LS fill:#d7ccc8
```

## 🌐 Arquitectura Frontend

### Componentes de Vista

```mermaid
graph TD
    subgraph "📄 Views Layer"
        L[Layout Principal] --> A[Auth Views]
        L --> D[Dashboard Views]
        L --> AD[Admin Views]
        L --> E[Error Views]
    end
    
    subgraph "🎨 Assets Layer"
        CSS[Tailwind CSS] --> C[Components]
        JS[JavaScript] --> F[Functions]
        JS --> S[Socket.IO Client]
    end
    
    subgraph "📱 Interactive Layer"
        M[Modales] --> QRT[QR Tutorial]
        M --> AR[Auto Response Modal]
        N[Notifications] --> T[Toast Messages]
        RT[Real-time Updates] --> QRU[QR Updates]
        RT --> SU[Status Updates]
    end
    
    A --> CSS
    D --> CSS
    AD --> CSS
    
    D --> JS
    AD --> JS
    
    style L fill:#e3f2fd
    style CSS fill:#f3e5f5
    style JS fill:#e8f5e8
```

## 🔐 Flujo de Autenticación

### Proceso OAuth 2.0

```mermaid
flowchart LR
    U[👤 Usuario] --> LP[🔑 Login Page]
    LP --> GO[🔵 Google OAuth]
    GO --> GS[📊 Google Servers]
    GS --> CB[🔙 Callback]
    CB --> P[🎫 Passport.js]
    P --> DB[(🗄️ Database)]
    DB --> S[💾 Session]
    S --> D[📊 Dashboard]
    
    style U fill:#e8f5e8
    style GO fill:#4285f4
    style GS fill:#34a853
    style P fill:#ea4335
    style D fill:#fbbc04
```

## 📊 Responsabilidades por Capa

### Frontend Layer
- 🎨 **Renderizado de UI** (EJS + Tailwind)
- ⚡ **Interacciones en tiempo real** (Socket.IO)
- 📱 **Gestión de estados** (JavaScript)
- 🎯 **Experiencia de usuario** (Modales, notificaciones)

### Backend Layer
- 🛤️ **Routing y middleware** (Express.js)
- 🔐 **Autenticación y autorización** (Passport.js)
- 📡 **API REST** (CRUD operations)
- 🔄 **Comunicación en tiempo real** (Socket.IO Server)

### Services Layer
- 📱 **Lógica de negocio WhatsApp** (WhatsappService)
- 🤖 **Procesamiento IA** (AIService)
- 📝 **Logging centralizado** (Winston)

### Data Layer
- 🗄️ **Persistencia de datos** (SQLite)
- 🔗 **ORM y relaciones** (Sequelize)
- 📊 **Modelos de negocio** (User, Instance, Response)

---

## 📈 Métricas de Arquitectura

### Cobertura de Funcionalidades
- **Autenticación:** 100% ✅
- **Gestión WhatsApp:** 100% ✅
- **Admin Panel:** 100% ✅
- **API REST:** 100% ✅
- **Real-time:** 100% ✅
- **Frontend:** 100% ✅
- **Logging:** 90% ✅
- **IA Integration:** 20% 🚧

### Escalabilidad
- **Usuarios concurrentes:** ✅ Soportado
- **Instancias WhatsApp:** ✅ Múltiples por usuario
- **Base de datos:** ✅ SQLite para small-medium scale
- **Sesiones:** ✅ Express sessions escalables

---

*Para más detalles técnicos, consulta `ARCHITECTURE.md` y `STATUS_REPORT.md`*
