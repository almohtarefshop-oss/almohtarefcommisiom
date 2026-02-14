export const generateId = () => Math.random().toString(36).substring(2, 9);

export const normalizeIndicDigits = (str: any) => {
  if (!str) return "";
  return String(str).replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
};

export const parseAndCleanInput = (input: string, isDeposit = false) => {
  if (!input) return [];
  return input.split(/[\n\s]+/)
      .map(s => normalizeIndicDigits(s))
      .map(s => parseFloat(s))
      .filter(n => !isNaN(n));
};

export const checkCommissionStatus = (row: any) => {
  if (row.isExtra) return 'extra';
  if (!row['فينيكس'] || row['فينيكس'] === "") return 'missing';
  
  // Basic validation logic
  const net = parseFloat(row["صافي المبلغ"]);
  const phx = parseFloat(row["فينيكس"]);
  
  if (isNaN(net) || isNaN(phx)) return 'invalid';

  // Commission calc logic from handlePhoenixMatching
  let expected = net < 100 ? 0.25 : (Math.floor(net / 100) * 0.5) + 0.25;
  const target = net + expected;
  
  // Allow small margin of error for float comparison
  if (Math.abs(phx - target) > 0.05) return 'invalid';
  
  return 'valid';
};

export const matchWalletLists = (agentList: number[], phxList: number[], type: string) => {
  const results = [];
  const agent = [...agentList];
  const phx = [...phxList];
  
  // Exact match logic
  for(let i = 0; i < agent.length; i++) {
      const val = agent[i];
      if (val === -1) continue;
      const pIdx = phx.indexOf(val);
      if(pIdx !== -1) {
          results.push({ id: generateId(), agent: val, phoenix: val, status: 'matched', type });
          agent[i] = -1;
          phx[pIdx] = -1;
      }
  }
  
  // Add remaining unmatched
  agent.forEach(x => {
    if (x !== -1) results.push({ id: generateId(), agent: x, phoenix: 0, status: 'unmatched_agent', type });
  });
  phx.forEach(x => {
    if (x !== -1) results.push({ id: generateId(), agent: 0, phoenix: x, status: 'unmatched_phoenix', type });
  });
  
  return results;
};
