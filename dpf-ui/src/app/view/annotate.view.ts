import { Component } from '@angular/core';

import { ClientRouter }  from 'rts-ts-client';
import { AnnotationService }                    from '../srv/annotation.srv';

@Component({
  selector: 'annotate-view',
  templateUrl: 'annotate.view.html'
})
export class AnnotateView {
  private annoProxy: AnnotationService

  tab = 0
  annotation: any = {}
  
  constructor(private router: ClientRouter) {
    this.annoProxy = router.createProxy('anno')
    
    this.annoProxy.allNonAnnotatedImages().then(images => {
      console.log('Non annotated: ', images)
    }).catch(_ => { console.log(_) })
    
    //demo data:
    this.annotation = {
      image: 1,

      quality: 'UNDEFINED',
      local: 'UNDEFINED',

      retinopathy:'UNDEFINED',
      maculopathy:'UNDEFINED',
      photocoagulation:'UNDEFINED'
    }
  }

  onQualityNext() {
    if (this.annotation.quality == 'BAD') {
      this.done()
    } else {
      this.tab = 1
    }
  }

  done() {
    console.log(this.annotation)
    console.log('DONE')
    //TODO: save or update ?
  }
}