import { enableProdMode }                   from '@angular/core';
import { platformBrowserDynamic }           from '@angular/platform-browser-dynamic';
import { AppModule }                        from './app/app.module';

if (process.env.ENV === 'production') {
  enableProdMode()
}

platformBrowserDynamic().bootstrapModule(AppModule)
.then(_ => { console.log('---APP-READY---') })
.catch(err => console.log(err))