// JavaScript Detection and Debugging Script
window.addEventListener('load', function() {
  console.log('Page fully loaded');
  
  // Check if React root element exists
  const rootElement = document.getElementById('root');
  if (rootElement) {
    console.log('Root element found:', rootElement.innerHTML.length > 0 ? 'Has content' : 'Empty');
  }
  
  // Check if React has rendered anything
  setTimeout(function() {
    const rootElement = document.getElementById('root');
    if (rootElement && rootElement.innerHTML.trim() === '') {
      console.error('React app may not have loaded properly');
      
      // Show debugging info
      const debugInfo = document.createElement('div');
      debugInfo.innerHTML = `
        <div style="
          position: fixed;
          top: 10px;
          right: 10px;
          background: rgba(220, 53, 69, 0.9);
          color: white;
          padding: 10px;
          border-radius: 5px;
          font-family: monospace;
          font-size: 12px;
          z-index: 10000;
          max-width: 300px;
        ">
          <strong>Debug Info:</strong><br>
          User Agent: ${navigator.userAgent}<br>
          JavaScript: Enabled<br>
          LocalStorage: ${typeof(Storage) !== "undefined" ? "Available" : "Not Available"}<br>
          Root Empty: Yes<br>
          Time: ${new Date().toLocaleTimeString()}
        </div>
      `;
      document.body.appendChild(debugInfo);
    }
  }, 3000);
});

// Browser compatibility check
function checkBrowserSupport() {
  const issues = [];
  
  // Check ES6 support
  try {
    new Function('() => {}')();
  } catch (e) {
    issues.push('Arrow functions not supported');
  }
  
  // Check Promise support
  if (typeof Promise === 'undefined') {
    issues.push('Promises not supported');
  }
  
  // Check fetch support
  if (typeof fetch === 'undefined') {
    issues.push('Fetch API not supported');
  }
  
  // Check modules support
  if (!('import' in document.createElement('script'))) {
    issues.push('ES Modules not supported');
  }
  
  if (issues.length > 0) {
    console.warn('Browser compatibility issues:', issues);
  }
  
  return issues;
}

checkBrowserSupport();
