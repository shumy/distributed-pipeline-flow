import { Component } from '@angular/core';

@Component({
  selector: 'dataset',
  templateUrl: 'dataset.view.html',
  styles: ['.main.menu { margin: 60px 20px 5px; }']
})
export class DatasetView {
  tab = 0
  
  //my datasets
  defaultDataset
  myDataSets = [
    { id: 1, name: 'my-demo', size: 10, progress: 7 },
    { id: 2, name: 'my-xpto', size: 15, progress: 8, default: true }
  ]

  //all datasets
  allSelected = false
  selectedNumber = 0
  otherDataSets = [
    { id: 1, name: 'all-demo', size: 10, selected: false },
    { id: 2, name: 'all-xpto', size: 15, selected: true }
  ]

  ngOnInit() {
    //TODO: (service) -> load my-dataset list
    this.defaultDataset = this.myDataSets[1]

    this.selectTab(0)
  }

  selectTab(selected: number) {
    this.tab = selected
    if (selected == 0)
      setTimeout(_ => {
        let pBars: any = $('.ui.progress')
        pBars.progress()
        pBars.removeClass('active')
      }, 1)
  }

  selectDefault(ds: any) {
    //do nothing, can't disable default!
    if (ds == this.defaultDataset) {
      console.log('Ignore...')
      return
    }

    this.defaultDataset.default = false
    this.defaultDataset = ds
    this.defaultDataset.default = true
    
    //TODO: (service) -> set my-default dataset
  }

  selectAll() {
    this.allSelected = !this.allSelected
    this.selectedNumber = this.allSelected ? this.otherDataSets.length : 0
    this.otherDataSets.forEach(_ => _.selected = this.allSelected)
  }

  selectDataset(ds: any) {
    ds.selected = !ds.selected
    ds.selected ? this.selectedNumber++ : this.selectedNumber--
    this.checkIfAllSelected()
  }

  checkIfAllSelected() {
    this.allSelected = this.otherDataSets.filter(_ => _.selected).length == this.otherDataSets.length
  }
}