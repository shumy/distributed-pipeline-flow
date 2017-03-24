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
  myDataSets: any = [
    { id: 1, name: 'my-demo', size: 10, progress: 7 },
    { id: 2, name: 'my-xpto', size: 15, progress: 8, default: true }
  ]

  //all datasets
  allSelected = false
  selectedNumber = 1
  otherDataSets: any = [
    { id: 1, name: 'all-demo', size: 10, selected: false },
    { id: 2, name: 'all-xpto', size: 15, selected: true }
  ]

  ngOnInit() {
    this.defaultDataset = this.myDataSets[1]

    this.selectTab(0)
  }

  selectTab(selected: number) {
    //TODO: (service) -> load my-dataset list

    this.tab = selected
    if (selected == 0)
      setTimeout(_ => {
        let pBars: any = $('.ui.progress')
        pBars.progress()
        pBars.removeClass('active')
      }, 1)
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

  selectDefault(ds: any) {
    this.defaultDataset.default = false
    this.defaultDataset = ds
    this.defaultDataset.default = true
    
    //TODO: (service) -> set my-default dataset
    toastr.success('Selected')
  }

  subscribe() {
    let subsDatasets = this.otherDataSets.filter(_ => _.selected)

    //TODO: (service) -> subscribe to datasets

    //On service OK
    this.allSelected = false
    this.selectedNumber = 0
    this.otherDataSets = this.otherDataSets.filter(_ => !_.selected)
    subsDatasets.forEach(ds => this.myDataSets.push(ds))
    toastr.success('Subscribed')
  }
}