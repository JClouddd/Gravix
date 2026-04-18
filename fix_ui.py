import re

# Fix ClientsModule.js
with open('src/components/modules/ClientsModule.js', 'r') as f:
    content = f.read()

# Fix direct DOM manipulation for export dropdown
export_state_addition = """
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [billingEntries, setBillingEntries] = useState([]);
"""
content = re.sub(r'const \[billingEntries, setBillingEntries\] = useState\(\[\]\);', export_state_addition.strip(), content)

old_export_btn = """<button className="btn btn-secondary btn-sm" onClick={() => document.getElementById('clientExportDropdown').classList.toggle('hidden')} >Export ▾</button>
             <div id="clientExportDropdown" className="hidden" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', padding: '8px', minWidth: '150px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '4px' }}>"""
new_export_btn = """<button className="btn btn-secondary btn-sm" onClick={() => setShowExportDropdown(!showExportDropdown)} >Export ▾</button>
             {showExportDropdown && (
               <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', padding: '8px', minWidth: '150px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '4px' }}>"""
content = content.replace(old_export_btn, new_export_btn)

# Add missing closing brace for conditional rendering if we replaced it
content = content.replace("export&format=json')}>Export as JSON</button>\n             </div>", "export&format=json')}>Export as JSON</button>\n               </div>\n             )}")

# Add tab navigation for 'contracts'
tab_nav_old = """<div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--card-border)' }}>
          {['overview', 'billing', 'communications', 'contracts'].map(tab => ("""
tab_nav_new = """<div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--card-border)' }}>
          {['overview', 'billing', 'contracts', 'communications'].map(tab => ("""
content = content.replace(tab_nav_old, tab_nav_new)


with open('src/components/modules/ClientsModule.js', 'w') as f:
    f.write(content)

# Fix FinanceModule.js
with open('src/components/modules/FinanceModule.js', 'r') as f:
    f_content = f.read()

finance_export_state = """
export default function FinanceModule() {
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
"""
f_content = re.sub(r'export default function FinanceModule\(\) \{\n  const \[activeTab, setActiveTab\] = useState\("Overview"\);', finance_export_state.strip(), f_content)

f_old_export_btn = """<button className="btn btn-secondary btn-sm" onClick={() => document.getElementById('financeExportDropdown').classList.toggle('hidden')} >Export Reports ▾</button>
             <div id="financeExportDropdown" className="hidden" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', padding: '8px', minWidth: '180px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '4px' }}>"""
f_new_export_btn = """<button className="btn btn-secondary btn-sm" onClick={() => setShowExportDropdown(!showExportDropdown)} >Export Reports ▾</button>
             {showExportDropdown && (
               <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', padding: '8px', minWidth: '180px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '4px' }}>"""
f_content = f_content.replace(f_old_export_btn, f_new_export_btn)
f_content = f_content.replace("finance_full&format=json')}>Export Full Report JSON</button>\n             </div>", "finance_full&format=json')}>Export Full Report JSON</button>\n               </div>\n             )}")

with open('src/components/modules/FinanceModule.js', 'w') as f:
    f.write(f_content)
