// js/updater.js (v57 - Auto-Updater Module for StashFlow)
'use strict';

var Updater = (function() {

  var APP_VERSION = '1.13.0';
  // Placeholder URL. You can change this to your actual server path.
  var UPDATE_URL  = 'https://raw.githubusercontent.com/waefull/StashFlow-Releases/main/updates.json';

  var _manifest = null;
  var _updateAvailable = false;
  var csInterface = new CSInterface();

  // Version compare (semver-like)
  function cmpVer(a, b) {
    var pa = String(a).split('.'), pb = String(b).split('.');
    for (var i = 0; i < 3; i++) {
      var na = parseInt(pa[i] || '0', 10);
      var nb = parseInt(pb[i] || '0', 10);
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  }

  // Check for updates
  function checkForUpdates(callback) {
    var url = UPDATE_URL;
    if (url.indexOf('data:') === 0) {
      try {
        var prefix = "data:application/json,";
        var payload = url.substring(prefix.length);
        var data = JSON.parse(decodeURIComponent(payload));
        _manifest = data;
        _updateAvailable = cmpVer(data.latest, APP_VERSION) > 0;
        if (callback) {
          setTimeout(function() {
            callback(null, {
              available: _updateAvailable,
              latest: data.latest,
              current: APP_VERSION,
              versions: data.versions || []
            });
          }, 50);
        }
      } catch(e) {
        if (callback) callback('Mock parse error: ' + e.message);
      }
      return;
    }

    url += (url.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now();
    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        _manifest = data;
        _updateAvailable = cmpVer(data.latest, APP_VERSION) > 0;
        if (callback) callback(null, {
          available: _updateAvailable,
          latest: data.latest,
          current: APP_VERSION,
          versions: data.versions || []
        });
      })
      .catch(function(err) {
        if (callback) callback(err.message || 'Network error');
      });
  }

  function isUpdateAvailable() { return _updateAvailable; }
  function getLatestVersion()  { return _manifest ? _manifest.latest : APP_VERSION; }
  function getChangelog()      { return _manifest ? (_manifest.versions || []) : []; }

  // Build changelog HTML for modal
  function buildChangelogHTML() {
    var versions = getChangelog();
    if (!versions.length) return '<div style="color:var(--text-secondary);font-size:11px;">No release notes available.</div>';
    var html = '<div style="text-align:left; max-height: 200px; overflow-y: auto; padding-right: 4px; font-size:11px; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;">';
    for (var i = 0; i < versions.length; i++) {
      var v = versions[i];
      var isNew = cmpVer(v.version, APP_VERSION) > 0;
      var isCurrent = v.version === APP_VERSION;
      
      var boxStyle = 'margin-bottom: 8px; padding: 6px 8px; border-radius: 6px;';
      if (isNew) {
        boxStyle += 'background: rgba(255, 149, 0, 0.06); border: 1px solid rgba(255, 149, 0, 0.25);';
      } else {
        boxStyle += 'border: 1px solid var(--border-color); opacity: 0.65;';
      }
      
      html += '<div style="' + boxStyle + '">';
      html += '<div style="display:flex; align-items:center; gap: 6px; font-weight:600; margin-bottom: 4px;">';
      html += '<span style="color:' + (isNew ? '#ff9500' : 'var(--text-primary)') + ';">v' + v.version + '</span>';
      if (isCurrent) html += '<span style="background:rgba(48,209,88,0.15); color:#30d158; font-size:8px; font-weight:700; padding:1px 4px; border-radius:4px; letter-spacing:0.3px;">CURRENT</span>';
      if (isNew)     html += '<span style="background:rgba(255,149,0,0.15); color:#ff9500; font-size:8px; font-weight:700; padding:1px 4px; border-radius:4px; letter-spacing:0.3px;">NEW UPDATE</span>';
      if (v.date)    html += '<span style="color:var(--text-secondary); font-size:9px; font-weight:400; margin-left:auto;">' + v.date + '</span>';
      html += '</div>';
      if (v.changes && v.changes.length) {
        html += '<ul style="margin: 0; padding-left: 14px; color: var(--text-secondary); line-height: 1.4em; font-size: 10px;">';
        for (var j = 0; j < v.changes.length; j++) {
          html += '<li style="margin-bottom: 2px;">' + v.changes[j] + '</li>';
        }
        html += '</ul>';
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  // Trigger installation via ExtendScript
  function installUpdate(callback) {
    if (!_manifest || !_updateAvailable) { callback('No update available'); return; }
    var url = _manifest.downloadUrl;
    if (!url) { callback('No download URL specified in manifest'); return; }

    var script = "installExtensionUpdate('" + url.replace(/'/g, "\\'") + "')";
    csInterface.evalScript(script, function(res) {
      try {
        var data = (typeof res === 'string' && (res.charAt(0) === '{' || res.charAt(0) === '[')) ? JSON.parse(res) : res;
        if (data && data.success) {
          callback(null, data);
        } else {
          callback((data && data.error) ? data.error : 'Installation failed');
        }
      } catch(e) {
        callback('Installation exception: ' + (res || e.message));
      }
    });
  }

  return {
    APP_VERSION:       APP_VERSION,
    checkForUpdates:   checkForUpdates,
    isUpdateAvailable: isUpdateAvailable,
    getLatestVersion:  getLatestVersion,
    getChangelog:      getChangelog,
    buildChangelogHTML: buildChangelogHTML,
    installUpdate:     installUpdate,
    cmpVer:            cmpVer
  };

})();
