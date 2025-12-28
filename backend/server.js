/**
 * DossierHub Backend Server
 * Simple Express server with JSON file as database
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');
const USERS_PATH = path.join(__dirname, 'users.json');
const DOCS_TEMPLATES_PATH = path.join(__dirname, 'documents-templates.json');
const DOC_ANALYSIS_PATH = path.join(__dirname, 'document-analysis.json');
const DEADLINES_PATH = path.join(__dirname, 'deadlines.json');

// JWT Secret (in production, use environment variable)
const JWT_SECRET = 'dossierhub-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// AUTH HELPERS
// ============================================

// Simple hash function (in production, use bcrypt)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

// Verify password
function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

// Generate JWT token
function generateToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

// Verify JWT token
function verifyToken(token) {
  try {
    const [header, payload, signature] = token.split('.');
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');
    
    if (signature !== expectedSignature) return null;
    
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (decoded.exp < Date.now()) return null;
    
    return decoded;
  } catch {
    return null;
  }
}

// Read users database
function readUsersDb() {
  const data = fs.readFileSync(USERS_PATH, 'utf-8');
  return JSON.parse(data);
}

// Write users database
function writeUsersDb(data) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(data, null, 2));
}

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
  
  req.user = decoded;
  next();
}

// Admin middleware
function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
}

// ============================================
// AUTH ENDPOINTS
// ============================================

// POST /api/auth/login - Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }
  
  const usersDb = readUsersDb();
  const user = usersDb.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }
  
  if (!user.isActive) {
    return res.status(401).json({ error: 'Compte désactivé' });
  }
  
  // For demo: accept "admin123" or "agent123" as passwords
  const isValidPassword = 
    (email === 'admin@agence.fr' && password === 'admin123') ||
    (password === 'agent123') ||
    verifyPassword(password, user.password);
  
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }
  
  // Update last login
  user.lastLogin = new Date().toISOString();
  writeUsersDb(usersDb);
  
  const token = generateToken(user);
  
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    }
  });
});

// GET /api/auth/me - Get current user
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const usersDb = readUsersDb();
  const user = usersDb.users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }
  
  res.json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin
  });
});

// GET /api/auth/users - Get all users (admin only)
app.get('/api/auth/users', authMiddleware, adminMiddleware, (req, res) => {
  const usersDb = readUsersDb();
  const db = readDb();
  
  // Count dossiers per agent
  const dossierCounts = {};
  db.dossiers.forEach(d => {
    dossierCounts[d.agentId] = (dossierCounts[d.agentId] || 0) + 1;
  });
  
  const users = usersDb.users.map(u => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt,
    lastLogin: u.lastLogin,
    dossierCount: dossierCounts[u.id] || 0
  }));
  
  res.json(users);
});

// POST /api/auth/users - Create user (admin only)
app.post('/api/auth/users', authMiddleware, adminMiddleware, (req, res) => {
  const { email, password, firstName, lastName, role } = req.body;
  
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ 
      error: 'Email, mot de passe, prénom et nom requis' 
    });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ 
      error: 'Le mot de passe doit contenir au moins 6 caractères' 
    });
  }
  
  const usersDb = readUsersDb();
  
  // Check if email already exists
  if (usersDb.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'Cet email est déjà utilisé' });
  }
  
  // Generate new ID
  const maxId = usersDb.users.reduce((max, u) => Math.max(max, u.id), 0);
  
  const newUser = {
    id: maxId + 1,
    email: email.toLowerCase(),
    password: hashPassword(password),
    firstName,
    lastName,
    role: role || 'agent',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLogin: null
  };
  
  usersDb.users.push(newUser);
  writeUsersDb(usersDb);
  
  // Also add to agents in main db for compatibility
  const db = readDb();
  db.agents.push({
    id: newUser.id,
    name: `${firstName} ${lastName}`,
    email: newUser.email
  });
  writeDb(db);
  
  res.status(201).json({
    id: newUser.id,
    email: newUser.email,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    role: newUser.role,
    isActive: newUser.isActive,
    createdAt: newUser.createdAt
  });
});

// PATCH /api/auth/users/:id - Update user (admin only)
app.patch('/api/auth/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  const userId = parseInt(req.params.id);
  const updates = req.body;
  
  const usersDb = readUsersDb();
  const userIndex = usersDb.users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }
  
  const user = usersDb.users[userIndex];
  
  // Update allowed fields
  if (updates.firstName !== undefined) user.firstName = updates.firstName;
  if (updates.lastName !== undefined) user.lastName = updates.lastName;
  if (updates.email !== undefined) {
    // Check if new email is already used
    const emailExists = usersDb.users.some(
      u => u.id !== userId && u.email.toLowerCase() === updates.email.toLowerCase()
    );
    if (emailExists) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }
    user.email = updates.email.toLowerCase();
  }
  if (updates.role !== undefined) user.role = updates.role;
  if (updates.isActive !== undefined) user.isActive = updates.isActive;
  if (updates.password !== undefined && updates.password.length >= 6) {
    user.password = hashPassword(updates.password);
  }
  
  writeUsersDb(usersDb);
  
  // Update in agents list too
  const db = readDb();
  const agentIndex = db.agents.findIndex(a => a.id === userId);
  if (agentIndex !== -1) {
    db.agents[agentIndex].name = `${user.firstName} ${user.lastName}`;
    db.agents[agentIndex].email = user.email;
    writeDb(db);
  }
  
  res.json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive
  });
});

// Helper: Read main database
function readDb() {
  const data = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

// Helper: Write main database
function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Helper: Read documents templates database
function readDocsDb() {
  const data = fs.readFileSync(DOCS_TEMPLATES_PATH, 'utf-8');
  return JSON.parse(data);
}

// Helper: Write documents templates database
function writeDocsDb(data) {
  fs.writeFileSync(DOCS_TEMPLATES_PATH, JSON.stringify(data, null, 2));
}

// Helper: Read document analysis database
function readAnalysisDb() {
  const data = fs.readFileSync(DOC_ANALYSIS_PATH, 'utf-8');
  return JSON.parse(data);
}

// Helper: Write document analysis database
function writeAnalysisDb(data) {
  fs.writeFileSync(DOC_ANALYSIS_PATH, JSON.stringify(data, null, 2));
}

// Helper: Enrich documents with AI analysis data
function enrichDocumentsWithAnalysis(dossierId, documents) {
  const analysisDb = readAnalysisDb();
  return documents.map(doc => {
    const analysisKey = `${dossierId}-${doc.id}`;
    const analysis = analysisDb.analyses[analysisKey];
    return {
      ...doc,
      analysis: analysis || null
    };
  });
}

// Helper: Format date for display
function formatRelativeDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < 24) {
    return `Auj. ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  } else if (diffDays < 2) {
    return `Hier ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  } else {
    const day = date.getDate();
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 
                    'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    return `${day} ${months[date.getMonth()]}`;
  }
}

// ============================================
// ROUTES
// ============================================

// GET /api/health - Health check endpoint (public)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// GET /api/agency - Get agency info
app.get('/api/agency', (req, res) => {
  const db = readDb();
  res.json(db.agency);
});

// PATCH /api/agency - Update agency info
app.patch('/api/agency', (req, res) => {
  const db = readDb();
  const updates = req.body;
  
  // Update agency fields
  if (updates.name !== undefined) db.agency.name = updates.name;
  if (updates.address !== undefined) db.agency.address = updates.address;
  if (updates.phone !== undefined) db.agency.phone = updates.phone;
  if (updates.email !== undefined) db.agency.email = updates.email;
  
  writeDb(db);
  
  res.json(db.agency);
});

// GET /api/agents - Get all agents
app.get('/api/agents', (req, res) => {
  const db = readDb();
  res.json(db.agents);
});

// GET /api/current-user - Get current logged in user
app.get('/api/current-user', (req, res) => {
  const db = readDb();
  res.json(db.currentUser);
});

// GET /api/dossiers - Get all dossiers with optional filters
app.get('/api/dossiers', (req, res) => {
  const db = readDb();
  let dossiers = [...db.dossiers];

  // Apply filters
  const { type, status, minScore, agentId } = req.query;

  if (type && type !== 'tous') {
    dossiers = dossiers.filter(d => d.type === type);
  }

  if (status && status !== 'tous') {
    dossiers = dossiers.filter(d => d.status === status);
  }

  if (minScore) {
    const min = parseFloat(minScore);
    dossiers = dossiers.filter(d => d.score && d.score >= min);
  }

  if (agentId) {
    dossiers = dossiers.filter(d => d.agentId === parseInt(agentId));
  }

  // Enrich with agent info and formatted dates
  const enrichedDossiers = dossiers.map(dossier => {
    const agent = db.agents.find(a => a.id === dossier.agentId);
    return {
      ...dossier,
      agentName: agent ? agent.name : 'Non assigné',
      updatedAtFormatted: formatRelativeDate(dossier.updatedAt)
    };
  });

  // Sort by updatedAt descending
  enrichedDossiers.sort((a, b) => 
    new Date(b.updatedAt) - new Date(a.updatedAt)
  );

  res.json(enrichedDossiers);
});

// GET /api/dossiers/:id - Get single dossier with full details
app.get('/api/dossiers/:id', (req, res) => {
  const db = readDb();
  const dossier = db.dossiers.find(d => d.id === parseInt(req.params.id));

  if (!dossier) {
    return res.status(404).json({ error: 'Dossier not found' });
  }

  const agent = db.agents.find(a => a.id === dossier.agentId);

  // Format history dates
  const historyFormatted = dossier.history.map(h => ({
    ...h,
    dateFormatted: formatRelativeDate(h.date)
  }));

  // Enrich documents with AI analysis
  const documentsWithAnalysis = enrichDocumentsWithAnalysis(dossier.id, dossier.documents || []);

  res.json({
    ...dossier,
    agent,
    documents: documentsWithAnalysis,
    history: historyFormatted
  });
});

// POST /api/dossiers - Create new dossier
app.post('/api/dossiers', (req, res) => {
  const db = readDb();
  const newId = Math.max(...db.dossiers.map(d => d.id), 0) + 1;
  const refNum = String(newId).padStart(3, '0');
  
  const newDossier = {
    id: newId,
    reference: `DOS-${new Date().getFullYear()}-${refNum}`,
    type: req.body.type || 'location',
    status: 'a_completer',
    score: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    agentId: req.body.agentId || 1,
    client: req.body.client || {},
    property: req.body.property || {},
    aiSummary: { description: '', strengths: [], warnings: [] },
    checklist: [],
    documents: [],
    history: [{
      id: 1,
      date: new Date().toISOString(),
      action: 'Dossier créé',
      type: 'creation'
    }]
  };

  db.dossiers.push(newDossier);
  writeDb(db);
  res.status(201).json(newDossier);
});

// PATCH /api/dossiers/:id - Update dossier
app.patch('/api/dossiers/:id', (req, res) => {
  const db = readDb();
  const index = db.dossiers.findIndex(d => d.id === parseInt(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: 'Dossier not found' });
  }

  db.dossiers[index] = {
    ...db.dossiers[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  writeDb(db);
  res.json(db.dossiers[index]);
});

// DELETE /api/dossiers/:id - Delete a dossier
app.delete('/api/dossiers/:id', (req, res) => {
  const db = readDb();
  const index = db.dossiers.findIndex(d => d.id === parseInt(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: 'Dossier not found' });
  }

  const deleted = db.dossiers.splice(index, 1)[0];
  writeDb(db);
  res.json({ message: 'Dossier deleted', dossier: deleted });
});

// PATCH /api/dossiers/:id/checklist/:checklistId - Update checklist item
app.patch('/api/dossiers/:id/checklist/:checklistId', (req, res) => {
  const db = readDb();
  const dossier = db.dossiers.find(d => d.id === parseInt(req.params.id));

  if (!dossier) {
    return res.status(404).json({ error: 'Dossier not found' });
  }

  const checklistItem = dossier.checklist.find(
    c => c.id === parseInt(req.params.checklistId)
  );

  if (!checklistItem) {
    return res.status(404).json({ error: 'Checklist item not found' });
  }

  Object.assign(checklistItem, req.body);
  dossier.updatedAt = new Date().toISOString();
  writeDb(db);

  res.json(checklistItem);
});

// GET /api/properties - Get all unique properties with dossier counts
app.get('/api/properties', (req, res) => {
  const db = readDb();
  
  // Group dossiers by property address
  const propertiesMap = new Map();
  
  db.dossiers.forEach(dossier => {
    const prop = dossier.property;
    const key = `${prop.address}-${prop.zipCode}-${prop.city}`;
    
    if (!propertiesMap.has(key)) {
      propertiesMap.set(key, {
        id: prop.id,
        address: prop.address,
        city: prop.city,
        zipCode: prop.zipCode,
        type: prop.type,
        // Extended property details
        description: prop.description || '',
        surface: prop.surface || null,
        rooms: prop.rooms || null,
        floor: prop.floor || null,
        hasParking: prop.hasParking || false,
        hasCellar: prop.hasCellar || false,
        hasElevator: prop.hasElevator || false,
        rent: prop.rent || null,
        price: prop.price || null,
        charges: prop.charges || null,
        // Dossier tracking
        dossierCount: 0,
        dossierIds: [],
        statuses: {
          a_completer: 0,
          complet: 0,
          en_cours: 0,
          archive: 0
        },
        // Dossier types (location/vente)
        dossierTypes: {
          location: 0,
          vente: 0
        },
        lastUpdate: dossier.updatedAt
      });
    }
    
    const entry = propertiesMap.get(key);
    entry.dossierCount++;
    entry.dossierIds.push(dossier.id);
    entry.statuses[dossier.status]++;
    // Track dossier types
    if (dossier.type === 'location') entry.dossierTypes.location++;
    if (dossier.type === 'vente') entry.dossierTypes.vente++;
    
    // Track most recent update
    if (new Date(dossier.updatedAt) > new Date(entry.lastUpdate)) {
      entry.lastUpdate = dossier.updatedAt;
    }
  });
  
  // Convert to array and add formatted date
  const properties = Array.from(propertiesMap.values()).map(prop => ({
    ...prop,
    lastUpdateFormatted: formatRelativeDate(prop.lastUpdate)
  }));
  
  // Sort by last update
  properties.sort((a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate));
  
  res.json(properties);
});

// GET /api/properties/:id/dossiers - Get all dossiers for a specific property
app.get('/api/properties/:id/dossiers', (req, res) => {
  const db = readDb();
  const propertyId = parseInt(req.params.id);
  
  let dossiers = db.dossiers.filter(d => d.property.id === propertyId);
  
  // Enrich with agent info and formatted dates
  const enrichedDossiers = dossiers.map(dossier => {
    const agent = db.agents.find(a => a.id === dossier.agentId);
    return {
      ...dossier,
      agentName: agent ? agent.name : 'Non assigné',
      updatedAtFormatted: formatRelativeDate(dossier.updatedAt)
    };
  });
  
  // Sort by updatedAt descending
  enrichedDossiers.sort((a, b) => 
    new Date(b.updatedAt) - new Date(a.updatedAt)
  );
  
  res.json(enrichedDossiers);
});

// POST /api/properties - Create a new property
app.post('/api/properties', (req, res) => {
  const db = readDb();
  const data = req.body;
  
  // Generate new property ID
  const maxPropertyId = db.dossiers.reduce((max, d) => 
    Math.max(max, d.property.id), 0
  );
  const newPropertyId = maxPropertyId + 1;
  
  // Create property object
  const newProperty = {
    id: newPropertyId,
    address: data.address,
    city: data.city,
    zipCode: data.zipCode,
    type: data.type || data.propertyType,
    transactionType: data.transactionType,
    description: data.description || '',
    surface: data.surface,
    rooms: data.rooms,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    floor: data.floor,
    totalFloors: data.totalFloors,
    buildYear: data.buildYear,
    hasParking: data.hasParking || false,
    hasCellar: data.hasCellar || false,
    hasElevator: data.hasElevator || false,
    hasBalcony: data.hasBalcony || false,
    hasTerrace: data.hasTerrace || false,
    hasGarden: data.hasGarden || false,
    isFurnished: data.isFurnished || false,
    rent: data.rent,
    charges: data.charges,
    deposit: data.deposit,
    price: data.price,
    pricePerSqm: data.pricePerSqm,
    agencyFees: data.agencyFees,
    notaryFees: data.notaryFees,
    dpeGrade: data.dpeGrade,
    gesGrade: data.gesGrade,
    isInCopro: data.isInCopro || false,
    coproCharges: data.coproCharges,
    coproLots: data.coproLots,
    availableFrom: data.availableFrom,
    internalNotes: data.internalNotes
  };
  
  // For now, we store the property without creating a dossier
  // The property will appear when a dossier is created for it
  // Return the property with ID so frontend can navigate
  res.status(201).json(newProperty);
});

// PATCH /api/properties/:id - Update property details
app.patch('/api/properties/:id', (req, res) => {
  const db = readDb();
  const propertyId = parseInt(req.params.id);
  const updates = req.body;
  
  // Find all dossiers with this property
  const dossiersWithProperty = db.dossiers.filter(
    d => d.property.id === propertyId
  );
  
  if (dossiersWithProperty.length === 0) {
    return res.status(404).json({ error: 'Property not found' });
  }
  
  // Update property in all related dossiers
  dossiersWithProperty.forEach(dossier => {
    const prop = dossier.property;
    
    // Update address fields
    if (updates.address !== undefined) prop.address = updates.address;
    if (updates.city !== undefined) prop.city = updates.city;
    if (updates.zipCode !== undefined) prop.zipCode = updates.zipCode;
    if (updates.type !== undefined) prop.type = updates.type;
    
    // Update extended property details
    if (updates.description !== undefined) prop.description = updates.description;
    if (updates.surface !== undefined) prop.surface = updates.surface;
    if (updates.rooms !== undefined) prop.rooms = updates.rooms;
    if (updates.floor !== undefined) prop.floor = updates.floor;
    if (updates.hasParking !== undefined) prop.hasParking = updates.hasParking;
    if (updates.hasCellar !== undefined) prop.hasCellar = updates.hasCellar;
    if (updates.hasElevator !== undefined) prop.hasElevator = updates.hasElevator;
    
    // Update financial fields
    if (updates.rent !== undefined) prop.rent = updates.rent;
    if (updates.price !== undefined) prop.price = updates.price;
    if (updates.charges !== undefined) prop.charges = updates.charges;
    
    // Update dossier timestamp
    dossier.updatedAt = new Date().toISOString();
  });
  
  writeDb(db);
  
  // Return updated property data
  const updatedProperty = dossiersWithProperty[0].property;
  res.json({
    id: updatedProperty.id,
    address: updatedProperty.address,
    city: updatedProperty.city,
    zipCode: updatedProperty.zipCode,
    type: updatedProperty.type,
    description: updatedProperty.description,
    surface: updatedProperty.surface,
    rooms: updatedProperty.rooms,
    floor: updatedProperty.floor,
    hasParking: updatedProperty.hasParking,
    hasCellar: updatedProperty.hasCellar,
    hasElevator: updatedProperty.hasElevator,
    rent: updatedProperty.rent,
    price: updatedProperty.price,
    charges: updatedProperty.charges,
    dossierCount: dossiersWithProperty.length,
    message: `Updated property in ${dossiersWithProperty.length} dossier(s)`
  });
});

// GET /api/search - Global search across clients, properties, dossiers
app.get('/api/search', (req, res) => {
  const db = readDb();
  const query = (req.query.q || '').toLowerCase().trim();
  
  if (!query || query.length < 2) {
    return res.json({ clients: [], properties: [], dossiers: [] });
  }
  
  const results = {
    clients: [],
    properties: [],
    dossiers: []
  };
  
  // Search in dossiers and extract unique clients
  const clientsMap = new Map();
  const propertiesMap = new Map();
  
  db.dossiers.forEach(dossier => {
    const client = dossier.client;
    const property = dossier.property;
    const clientFullName = `${client.firstName} ${client.lastName}`.toLowerCase();
    const clientKey = `${client.firstName}-${client.lastName}-${client.email}`;
    
    // Search clients
    if (
      clientFullName.includes(query) ||
      client.email.toLowerCase().includes(query) ||
      client.phone.includes(query)
    ) {
      if (!clientsMap.has(clientKey)) {
        clientsMap.set(clientKey, {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          type: client.type,
          dossierId: dossier.id
        });
      }
    }
    
    // Search properties
    const propertyKey = `${property.address}-${property.zipCode}`;
    const propertySearch = `${property.address} ${property.city} ${property.zipCode}`.toLowerCase();
    
    if (propertySearch.includes(query)) {
      if (!propertiesMap.has(propertyKey)) {
        propertiesMap.set(propertyKey, {
          id: property.id,
          address: property.address,
          city: property.city,
          zipCode: property.zipCode,
          type: property.type
        });
      }
    }
    
    // Search dossiers by reference
    if (
      dossier.reference.toLowerCase().includes(query) ||
      clientFullName.includes(query) ||
      propertySearch.includes(query)
    ) {
      results.dossiers.push({
        id: dossier.id,
        reference: dossier.reference,
        type: dossier.type,
        status: dossier.status,
        clientName: `${client.firstName} ${client.lastName}`,
        propertyAddress: property.address
      });
    }
  });
  
  results.clients = Array.from(clientsMap.values()).slice(0, 5);
  results.properties = Array.from(propertiesMap.values()).slice(0, 5);
  results.dossiers = results.dossiers.slice(0, 5);
  
  res.json(results);
});

// ============================================
// CLIENT CRM ENDPOINTS
// ============================================

// GET /api/clients - Get all unique clients with stats
app.get('/api/clients', (req, res) => {
  const db = readDb();
  const clientsMap = new Map();
  
  // Extract unique clients from dossiers
  db.dossiers.forEach(dossier => {
    const client = dossier.client;
    const key = client.email;
    
    if (!clientsMap.has(key)) {
      clientsMap.set(key, {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        type: client.type,
        dossiers: [],
        stats: {
          total: 0,
          active: 0,
          completed: 0,
          archived: 0
        },
        lastActivity: dossier.updatedAt,
        firstContact: dossier.createdAt
      });
    }
    
    const clientData = clientsMap.get(key);
    clientData.dossiers.push({
      id: dossier.id,
      reference: dossier.reference,
      type: dossier.type,
      status: dossier.status,
      property: dossier.property,
      createdAt: dossier.createdAt,
      updatedAt: dossier.updatedAt
    });
    
    clientData.stats.total++;
    if (dossier.status === 'archive') {
      clientData.stats.archived++;
    } else if (dossier.status === 'complet') {
      clientData.stats.completed++;
    } else {
      clientData.stats.active++;
    }
    
    // Track latest activity
    if (new Date(dossier.updatedAt) > new Date(clientData.lastActivity)) {
      clientData.lastActivity = dossier.updatedAt;
    }
    if (new Date(dossier.createdAt) < new Date(clientData.firstContact)) {
      clientData.firstContact = dossier.createdAt;
    }
  });
  
  // Add interactions count and preferences
  const clients = Array.from(clientsMap.values()).map(client => {
    const interactions = (db.clientInteractions || [])
      .filter(i => i.clientEmail === client.email);
    const preferences = (db.clientPreferences || [])
      .find(p => p.clientEmail === client.email);
    
    return {
      ...client,
      interactionsCount: interactions.length,
      hasPreferences: !!preferences,
      lastActivityFormatted: formatRelativeDate(client.lastActivity)
    };
  });
  
  // Sort by last activity (most recent first)
  clients.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
  
  res.json(clients);
});

// GET /api/clients/:email - Get single client with full details
app.get('/api/clients/:email', (req, res) => {
  const db = readDb();
  const email = decodeURIComponent(req.params.email);
  
  // Find all dossiers for this client
  const dossiers = db.dossiers.filter(d => d.client.email === email);
  
  if (dossiers.length === 0) {
    return res.status(404).json({ error: 'Client not found' });
  }
  
  const client = dossiers[0].client;
  
  // Get interactions
  const interactions = (db.clientInteractions || [])
    .filter(i => i.clientEmail === email)
    .map(i => ({
      ...i,
      agentName: db.agents.find(a => a.id === i.agentId)?.name || 'Agent',
      createdAtFormatted: formatRelativeDate(i.createdAt)
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Get preferences
  const preferences = (db.clientPreferences || [])
    .find(p => p.clientEmail === email) || null;
  
  // Calculate stats
  const stats = {
    total: dossiers.length,
    active: dossiers.filter(d => !['archive', 'complet'].includes(d.status)).length,
    completed: dossiers.filter(d => d.status === 'complet').length,
    archived: dossiers.filter(d => d.status === 'archive').length
  };
  
  // Format dossiers with additional info
  const formattedDossiers = dossiers.map(d => ({
    id: d.id,
    reference: d.reference,
    type: d.type,
    status: d.status,
    score: d.score,
    property: d.property,
    agentName: db.agents.find(a => a.id === d.agentId)?.name || 'Agent',
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    createdAtFormatted: formatRelativeDate(d.createdAt),
    updatedAtFormatted: formatRelativeDate(d.updatedAt)
  })).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  
  res.json({
    id: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
    phone: client.phone,
    type: client.type,
    profession: client.profession,
    income: client.income,
    dossiers: formattedDossiers,
    interactions,
    preferences,
    stats,
    firstContact: dossiers.reduce((min, d) => 
      new Date(d.createdAt) < new Date(min) ? d.createdAt : min, 
      dossiers[0].createdAt
    ),
    lastActivity: dossiers.reduce((max, d) => 
      new Date(d.updatedAt) > new Date(max) ? d.updatedAt : max, 
      dossiers[0].updatedAt
    )
  });
});

// POST /api/clients/:email/interactions - Add interaction
app.post('/api/clients/:email/interactions', (req, res) => {
  const db = readDb();
  const email = decodeURIComponent(req.params.email);
  const { type, content, dueDate } = req.body;
  
  if (!db.clientInteractions) {
    db.clientInteractions = [];
  }
  
  const newId = db.clientInteractions.length > 0 
    ? Math.max(...db.clientInteractions.map(i => i.id)) + 1 
    : 1;
  
  const interaction = {
    id: newId,
    clientEmail: email,
    type,
    content,
    createdAt: new Date().toISOString(),
    agentId: db.currentUser.id
  };
  
  if (type === 'reminder' && dueDate) {
    interaction.dueDate = dueDate;
    interaction.completed = false;
  }
  
  db.clientInteractions.push(interaction);
  writeDb(db);
  
  // Return with agent name
  interaction.agentName = db.agents.find(a => a.id === interaction.agentId)?.name;
  interaction.createdAtFormatted = formatRelativeDate(interaction.createdAt);
  
  res.status(201).json(interaction);
});

// PATCH /api/clients/:email/preferences - Update preferences
app.patch('/api/clients/:email/preferences', (req, res) => {
  const db = readDb();
  const email = decodeURIComponent(req.params.email);
  
  if (!db.clientPreferences) {
    db.clientPreferences = [];
  }
  
  const existingIndex = db.clientPreferences
    .findIndex(p => p.clientEmail === email);
  
  const preferences = {
    clientEmail: email,
    ...req.body
  };
  
  if (existingIndex >= 0) {
    db.clientPreferences[existingIndex] = {
      ...db.clientPreferences[existingIndex],
      ...preferences
    };
  } else {
    db.clientPreferences.push(preferences);
  }
  
  writeDb(db);
  res.json(db.clientPreferences.find(p => p.clientEmail === email));
});

// PATCH /api/interactions/:id - Update interaction (e.g., complete reminder)
app.patch('/api/interactions/:id', (req, res) => {
  const db = readDb();
  const id = parseInt(req.params.id);
  
  const interaction = db.clientInteractions?.find(i => i.id === id);
  if (!interaction) {
    return res.status(404).json({ error: 'Interaction not found' });
  }
  
  Object.assign(interaction, req.body);
  writeDb(db);
  
  res.json(interaction);
});

// GET /api/stats - Get dashboard statistics
app.get('/api/stats', (req, res) => {
  const db = readDb();
  const dossiers = db.dossiers;

  const stats = {
    total: dossiers.length,
    location: dossiers.filter(d => d.type === 'location').length,
    vente: dossiers.filter(d => d.type === 'vente').length,
    complet: dossiers.filter(d => d.status === 'complet').length,
    aCompleter: dossiers.filter(d => d.status === 'a_completer').length,
    enCours: dossiers.filter(d => d.status === 'en_cours').length,
    archive: dossiers.filter(d => d.status === 'archive').length,
    avgScore: dossiers
      .filter(d => d.score)
      .reduce((sum, d, _, arr) => sum + d.score / arr.length, 0)
      .toFixed(1)
  };

  res.json(stats);
});

// ============================================
// DOCUMENT COLLECTION ENDPOINTS (VENTE MODULE)
// ============================================

// GET /api/vente/templates - Get all document templates
app.get('/api/vente/templates', (req, res) => {
  const docsDb = readDocsDb();
  res.json({
    sources: docsDb.documentSources,
    templates: docsDb.venteTemplates
  });
});

// GET /api/vente/templates/:type - Get specific template
app.get('/api/vente/templates/:type', (req, res) => {
  const docsDb = readDocsDb();
  const template = docsDb.venteTemplates[req.params.type];
  
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  
  res.json({
    sources: docsDb.documentSources,
    template
  });
});

// GET /api/dossiers/:id/collect-links - Get all collect links for a dossier
app.get('/api/dossiers/:id/collect-links', (req, res) => {
  const docsDb = readDocsDb();
  const dossierId = parseInt(req.params.id);
  
  const links = docsDb.collectLinks.filter(l => l.dossierId === dossierId);
  
  // Enrich with template info and stats
  const enrichedLinks = links.map(link => {
    const received = link.documents.filter(d => d.status === 'received').length;
    const total = link.documents.filter(d => d.status !== 'not_applicable').length;
    const source = docsDb.documentSources.find(s => s.id === link.sourceType);
    
    return {
      ...link,
      sourceInfo: source,
      stats: { received, total, percentage: total > 0 ? Math.round(received / total * 100) : 0 }
    };
  });
  
  res.json(enrichedLinks);
});

// POST /api/dossiers/:id/collect-links - Create a new collect link
app.post('/api/dossiers/:id/collect-links', (req, res) => {
  const docsDb = readDocsDb();
  const dossierId = parseInt(req.params.id);
  const { sourceType, sourceName, sourceEmail, templateType } = req.body;
  
  // Get template documents for this source
  const template = docsDb.venteTemplates[templateType];
  if (!template) {
    return res.status(400).json({ error: 'Invalid template type' });
  }
  
  const sourceDocuments = template.documents[sourceType] || [];
  
  // Generate unique token
  const token = `collect-${dossierId}-${sourceType}-${Date.now()}`;
  
  // Create new collect link
  const newId = docsDb.collectLinks.length > 0
    ? Math.max(...docsDb.collectLinks.map(l => l.id)) + 1
    : 1;
  
  const newLink = {
    id: newId,
    token,
    dossierId,
    sourceType,
    sourceName,
    sourceEmail,
    templateType,
    documents: sourceDocuments.map(doc => ({
      docId: doc.id,
      status: 'pending'
    })),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    lastAccessedAt: null
  };
  
  docsDb.collectLinks.push(newLink);
  writeDocsDb(docsDb);
  
  // Return enriched link
  const source = docsDb.documentSources.find(s => s.id === sourceType);
  res.status(201).json({
    ...newLink,
    sourceInfo: source,
    stats: { received: 0, total: sourceDocuments.length, percentage: 0 }
  });
});

// GET /api/collect/:token - Public endpoint for third parties
app.get('/api/collect/:token', (req, res) => {
  const docsDb = readDocsDb();
  const db = readDb();
  const { token } = req.params;
  
  const link = docsDb.collectLinks.find(l => l.token === token);
  if (!link) {
    return res.status(404).json({ error: 'Link not found or expired' });
  }
  
  // Check expiration
  if (new Date(link.expiresAt) < new Date()) {
    return res.status(410).json({ error: 'Link has expired' });
  }
  
  // Update last accessed
  link.lastAccessedAt = new Date().toISOString();
  writeDocsDb(docsDb);
  
  // Get dossier info (property address)
  const dossier = db.dossiers.find(d => d.id === link.dossierId);
  
  // Get template to enrich document names
  const template = docsDb.venteTemplates[link.templateType];
  const sourceDocuments = template?.documents[link.sourceType] || [];
  
  // Enrich documents with names
  const enrichedDocuments = link.documents.map(doc => {
    const templateDoc = sourceDocuments.find(td => td.id === doc.docId);
    return {
      ...doc,
      name: templateDoc?.name || 'Document inconnu',
      required: templateDoc?.required || false,
      condition: templateDoc?.condition
    };
  });
  
  const source = docsDb.documentSources.find(s => s.id === link.sourceType);
  
  res.json({
    sourceName: link.sourceName,
    sourceType: link.sourceType,
    sourceInfo: source,
    property: dossier?.property || null,
    agencyName: db.agency.name,
    documents: enrichedDocuments,
    expiresAt: link.expiresAt
  });
});

// POST /api/collect/:token/upload - Upload a document (third party)
app.post('/api/collect/:token/upload', (req, res) => {
  const docsDb = readDocsDb();
  const { token } = req.params;
  const { docId, fileName } = req.body;
  
  const link = docsDb.collectLinks.find(l => l.token === token);
  if (!link) {
    return res.status(404).json({ error: 'Link not found' });
  }
  
  // Check expiration
  if (new Date(link.expiresAt) < new Date()) {
    return res.status(410).json({ error: 'Link has expired' });
  }
  
  // Find and update document
  const doc = link.documents.find(d => d.docId === docId);
  if (!doc) {
    return res.status(400).json({ error: 'Document not found in this collection' });
  }
  
  doc.status = 'received';
  doc.fileName = fileName;
  doc.uploadedAt = new Date().toISOString();
  
  link.lastAccessedAt = new Date().toISOString();
  writeDocsDb(docsDb);
  
  res.json({ success: true, document: doc });
});

// PATCH /api/collect-links/:id/documents/:docId - Update document status (agent)
app.patch('/api/collect-links/:id/documents/:docId', (req, res) => {
  const docsDb = readDocsDb();
  const linkId = parseInt(req.params.id);
  const { docId } = req.params;
  const { status } = req.body;
  
  const link = docsDb.collectLinks.find(l => l.id === linkId);
  if (!link) {
    return res.status(404).json({ error: 'Link not found' });
  }
  
  const doc = link.documents.find(d => d.docId === docId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  
  doc.status = status;
  if (status === 'not_applicable') {
    delete doc.fileName;
    delete doc.uploadedAt;
  }
  
  writeDocsDb(docsDb);
  res.json(doc);
});

// DELETE /api/collect-links/:id - Delete a collect link
app.delete('/api/collect-links/:id', (req, res) => {
  const docsDb = readDocsDb();
  const linkId = parseInt(req.params.id);
  
  const index = docsDb.collectLinks.findIndex(l => l.id === linkId);
  if (index === -1) {
    return res.status(404).json({ error: 'Link not found' });
  }
  
  docsDb.collectLinks.splice(index, 1);
  writeDocsDb(docsDb);
  
  res.json({ success: true });
});

// ============================================
// DOCUMENT AI ANALYSIS ENDPOINTS
// ============================================

// GET /api/documents/:dossierId/:docId/analysis - Get analysis for a document
app.get('/api/documents/:dossierId/:docId/analysis', (req, res) => {
  const { dossierId, docId } = req.params;
  const analysisDb = readAnalysisDb();
  const analysisKey = `${dossierId}-${docId}`;
  const analysis = analysisDb.analyses[analysisKey];
  
  if (!analysis) {
    return res.status(404).json({ error: 'Analysis not found' });
  }
  
  res.json(analysis);
});

// POST /api/documents/:dossierId/:docId/analyze - Trigger analysis for a document (simulation)
app.post('/api/documents/:dossierId/:docId/analyze', (req, res) => {
  const { dossierId, docId } = req.params;
  const { filename, expectedType } = req.body;
  
  // Simulate AI analysis with random but realistic results
  const simulatedAnalysis = generateSimulatedAnalysis(filename, expectedType);
  
  // Store the analysis
  const analysisDb = readAnalysisDb();
  const analysisKey = `${dossierId}-${docId}`;
  analysisDb.analyses[analysisKey] = simulatedAnalysis;
  writeAnalysisDb(analysisDb);
  
  res.json({
    status: 'completed',
    analysis: simulatedAnalysis
  });
});

// Helper: Generate simulated AI analysis
function generateSimulatedAnalysis(filename, expectedType) {
  const templates = {
    'Identité': {
      detectedType: 'Carte Nationale d\'Identité',
      extractedData: {
        type: 'CNI',
        nom: 'DUPONT',
        prenom: 'Marie',
        dateNaissance: '15/07/1985',
        lieuNaissance: 'Paris (75)',
        numeroDocument: '850715XXXXXX',
        dateExpiration: '12/03/2029'
      },
      summary: 'CNI valide de Mme Marie DUPONT, née le 15/07/1985 à Paris. Document en cours de validité jusqu\'au 12/03/2029.',
      alerts: []
    },
    'Revenus': {
      detectedType: 'Bulletins de salaire',
      extractedData: {
        type: 'Fiches de paie',
        employeur: 'Société ABC',
        periode: 'Oct-Nov-Déc 2023',
        salaireBrut: '4 200 €',
        salaireNet: '3 280 €'
      },
      summary: '3 bulletins de salaire récents. Salaire net moyen: 3 280€. Emploi stable en CDI.',
      alerts: []
    },
    'Fiscalité': {
      detectedType: 'Avis d\'imposition',
      extractedData: {
        type: 'Avis d\'imposition 2023',
        anneeRevenus: '2022',
        revenuFiscal: '38 500 €',
        nombreParts: '1',
        montantImpot: '3 500 €'
      },
      summary: 'Avis d\'imposition 2023 (revenus 2022). Revenu fiscal: 38 500€. Cohérent avec les revenus déclarés.',
      alerts: []
    },
    'Professionnel': {
      detectedType: 'Contrat de travail',
      extractedData: {
        type: 'CDI',
        employeur: 'Entreprise XYZ',
        poste: 'Responsable projet',
        dateDebut: '01/03/2020',
        salaireAnnuel: '48 000 €'
      },
      summary: 'CDI depuis mars 2020. Poste: Responsable projet. Ancienneté: 3+ ans. Situation professionnelle stable.',
      alerts: []
    },
    'Propriété': {
      detectedType: 'Titre de propriété',
      extractedData: {
        type: 'Acte authentique',
        dateActe: '2019',
        bien: 'Appartement',
        surface: '75 m²',
        notaire: 'Me Durand'
      },
      summary: 'Titre de propriété authentique. Document complet et conforme. Propriétaire légitime confirmé.',
      alerts: []
    },
    'Diagnostics': {
      detectedType: 'Dossier de diagnostics',
      extractedData: {
        type: 'Pack diagnostics',
        dpe: 'Classe C',
        ges: 'Classe B',
        validite: '2033'
      },
      summary: 'Pack diagnostics complet. DPE classe C. Tous diagnostics conformes et valides.',
      alerts: []
    }
  };
  
  const template = templates[expectedType] || {
    detectedType: expectedType || 'Document',
    extractedData: { type: expectedType || 'Document non classifié' },
    summary: 'Document analysé. Vérification manuelle recommandée.',
    alerts: [{ type: 'info', message: 'Type de document non reconnu automatiquement' }]
  };
  
  // Add some randomness for demo
  const confidence = Math.floor(Math.random() * 15) + 85; // 85-100%
  const isWarning = Math.random() < 0.15; // 15% chance of warning
  
  let status = 'validated';
  let alerts = [...template.alerts];
  
  if (isWarning) {
    status = 'warning';
    alerts.push({ 
      type: 'warning', 
      message: 'Qualité de scan moyenne - certains détails peu lisibles' 
    });
  }
  
  return {
    status,
    confidence,
    detectedType: template.detectedType,
    isCorrectType: true,
    isComplete: !isWarning,
    isReadable: confidence > 80,
    extractedData: template.extractedData,
    summary: template.summary,
    alerts,
    analyzedAt: new Date().toISOString()
  };
}

// ============================================
// DEADLINES ENDPOINTS
// ============================================

// Read deadlines database
function readDeadlinesDb() {
  try {
    const data = fs.readFileSync(DEADLINES_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading deadlines.json:', error);
    return { deadlineTypes: [], dossierDeadlines: [] };
  }
}

// Write deadlines database
function writeDeadlinesDb(data) {
  fs.writeFileSync(DEADLINES_PATH, JSON.stringify(data, null, 2));
}

// Calculate days remaining and urgency
function enrichDeadline(deadline, deadlineTypes, dossiers) {
  const deadlineType = deadlineTypes.find(t => t.id === deadline.deadlineTypeId);
  const dossier = dossiers.find(d => d.id === deadline.dossierId);
  
  const now = new Date();
  const dueDate = new Date(deadline.dueDate);
  const daysRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
  
  let urgency = 'ok';
  if (daysRemaining < 0) {
    urgency = 'overdue';
  } else if (daysRemaining <= 3) {
    urgency = 'critical';
  } else if (daysRemaining <= 7) {
    urgency = 'warning';
  }
  
  return {
    ...deadline,
    deadlineType,
    dossier: dossier ? {
      id: dossier.id,
      reference: dossier.reference,
      client: dossier.client,
      property: dossier.property
    } : null,
    daysRemaining,
    urgency
  };
}

// GET /api/deadlines - Get all deadlines with summary
app.get('/api/deadlines', authMiddleware, (req, res) => {
  try {
    const deadlinesDb = readDeadlinesDb();
    const db = readDb();
    
    // Enrich deadlines with computed fields
    const enrichedDeadlines = deadlinesDb.dossierDeadlines
      .map(d => enrichDeadline(d, deadlinesDb.deadlineTypes, db.dossiers))
      .filter(d => d.status === 'pending') // Only show pending deadlines
      .sort((a, b) => a.daysRemaining - b.daysRemaining); // Sort by urgency
    
    // Calculate summary
    const critical = enrichedDeadlines.filter(d => d.urgency === 'critical').length;
    const warning = enrichedDeadlines.filter(d => d.urgency === 'warning').length;
    const ok = enrichedDeadlines.filter(d => d.urgency === 'ok').length;
    const overdue = enrichedDeadlines.filter(d => d.urgency === 'overdue').length;
    
    res.json({
      summary: {
        critical: critical + overdue, // Group overdue with critical
        warning,
        ok,
        total: enrichedDeadlines.length
      },
      deadlines: enrichedDeadlines
    });
  } catch (error) {
    console.error('Error fetching deadlines:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des délais' });
  }
});

// GET /api/deadlines/types - Get all deadline types
app.get('/api/deadlines/types', authMiddleware, (req, res) => {
  try {
    const deadlinesDb = readDeadlinesDb();
    res.json(deadlinesDb.deadlineTypes);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des types de délais' });
  }
});

// POST /api/deadlines - Create a new deadline for a dossier
app.post('/api/deadlines', authMiddleware, (req, res) => {
  try {
    const { dossierId, deadlineTypeId, startDate, dueDate, notes } = req.body;
    
    if (!dossierId || !deadlineTypeId || !dueDate) {
      return res.status(400).json({ 
        error: 'dossierId, deadlineTypeId et dueDate sont requis' 
      });
    }
    
    const deadlinesDb = readDeadlinesDb();
    
    // Generate new ID
    const maxId = Math.max(...deadlinesDb.dossierDeadlines.map(d => d.id), 0);
    
    const newDeadline = {
      id: maxId + 1,
      dossierId,
      deadlineTypeId,
      startDate: startDate || new Date().toISOString().split('T')[0],
      dueDate,
      status: 'pending',
      notes: notes || ''
    };
    
    deadlinesDb.dossierDeadlines.push(newDeadline);
    writeDeadlinesDb(deadlinesDb);
    
    res.status(201).json(newDeadline);
  } catch (error) {
    console.error('Error creating deadline:', error);
    res.status(500).json({ error: 'Erreur lors de la création du délai' });
  }
});

// PATCH /api/deadlines/:id - Update a deadline (e.g., mark as completed)
app.patch('/api/deadlines/:id', authMiddleware, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updates = req.body;
    
    const deadlinesDb = readDeadlinesDb();
    const index = deadlinesDb.dossierDeadlines.findIndex(d => d.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Délai non trouvé' });
    }
    
    deadlinesDb.dossierDeadlines[index] = {
      ...deadlinesDb.dossierDeadlines[index],
      ...updates
    };
    
    writeDeadlinesDb(deadlinesDb);
    res.json(deadlinesDb.dossierDeadlines[index]);
  } catch (error) {
    console.error('Error updating deadline:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du délai' });
  }
});

// DELETE /api/deadlines/:id - Delete a deadline
app.delete('/api/deadlines/:id', authMiddleware, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    
    const deadlinesDb = readDeadlinesDb();
    const index = deadlinesDb.dossierDeadlines.findIndex(d => d.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Délai non trouvé' });
    }
    
    deadlinesDb.dossierDeadlines.splice(index, 1);
    writeDeadlinesDb(deadlinesDb);
    
    res.json({ success: true, message: 'Délai supprimé' });
  } catch (error) {
    console.error('Error deleting deadline:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du délai' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🏠 DossierHub Backend running on http://localhost:${PORT}`);
  console.log(`📁 Using database: ${DB_PATH}`);
});

