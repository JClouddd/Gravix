with open('src/components/modules/ClientsModule.js', 'r') as f:
    content = f.read()

bad = """             {showExportDropdown && (
               <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', padding: '8px', minWidth: '150px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '4px' }}>
               <button className="btn btn-ghost btn-sm" style={{ textAlign: 'left', width: '100%' }} onClick={() => window.open('/api/export?type=clients&format=csv')}>Export as CSV</button>
               <button className="btn btn-ghost btn-sm" style={{ textAlign: 'left', width: '100%' }} onClick={() => window.open('/api/export?type=clients&format=json')}>Export as JSON</button>
             </div>
          </div>"""

good = """             {showExportDropdown && (
               <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', padding: '8px', minWidth: '150px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <button className="btn btn-ghost btn-sm" style={{ textAlign: 'left', width: '100%' }} onClick={() => window.open('/api/export?type=clients&format=csv')}>Export as CSV</button>
                 <button className="btn btn-ghost btn-sm" style={{ textAlign: 'left', width: '100%' }} onClick={() => window.open('/api/export?type=clients&format=json')}>Export as JSON</button>
               </div>
             )}
          </div>"""

content = content.replace(bad, good)

with open('src/components/modules/ClientsModule.js', 'w') as f:
    f.write(content)
