(function(global) {

  // map tells the System loader where to look for things
  var map = {
    'main':                       'dist',
    'rxjs':                       'node_modules/rxjs',
    'dropzone':                   'node_modules/dropzone/dist/min',
    '@angular':                   'node_modules/@angular'
  };

  // packages tells the System loader how to load when no filename and/or no extension
  var packages = {
    'main':                       { main: 'main.js', defaultExtension: 'js' },
    'rxjs':                       { defaultExtension: 'js' },
    'dropzone':                   { main: 'dropzone.min.js', defaultExtension: 'js' },
  };

  var packageNames = [
    '@angular/common',
    '@angular/compiler',
    '@angular/core',
    '@angular/http',
    '@angular/platform-browser',
    '@angular/platform-browser-dynamic',
    '@angular/router'
  ];

  // add package entries for angular packages in the form '@angular/common': { main: 'index.js', defaultExtension: 'js' }
  packageNames.forEach(function(pkgName) {
    packages[pkgName] = { main: 'index.js', defaultExtension: 'js' };
  });

  var config = {
    map: map,
    packages: packages
  }

  // filterSystemConfig - index.html's chance to modify config before we register it.
  if (global.filterSystemConfig) { global.filterSystemConfig(config); }

  System.config(config);
  System.import('main').catch(function(err){ console.error(err); });

})(this);