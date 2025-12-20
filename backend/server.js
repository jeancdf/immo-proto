/**
 * DossierHub Backend Server
 * Simple Express server with JSON file as database
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

// Middleware
app.use(cors());
app.use(express.json());

// Helper: Read database
function readDb() {
  const data = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

// Helper: Write database
function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
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

// GET /api/agency - Get agency info
app.get('/api/agency', (req, res) => {
  const db = readDb();
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

  res.json({
    ...dossier,
    agent,
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
        lastUpdate: dossier.updatedAt
      });
    }
    
    const entry = propertiesMap.get(key);
    entry.dossierCount++;
    entry.dossierIds.push(dossier.id);
    entry.statuses[dossier.status]++;
    
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

// Start server
app.listen(PORT, () => {
  console.log(`🏠 DossierHub Backend running on http://localhost:${PORT}`);
  console.log(`📁 Using database: ${DB_PATH}`);
});

