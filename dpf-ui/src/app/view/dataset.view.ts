import { Component } from '@angular/core';
import { ClientRouter }  from 'rts-ts-client';

import { DatasetService, DatasetInfo } from '../srv/dataset.srv';

@Component({
  selector: 'dataset',
  templateUrl: 'dataset.view.html',
  styles: ['.main.menu { margin: 60px 20px 5px; }']
})
export class DatasetView {
  private dsProxy: DatasetService

  tab = 0
  
  //my datasets
  defaultDataset
  myDataSets: DatasetInfo[]

  //all datasets
  allSelected = false
  selectedNumber = 0
  otherDataSets: DatasetInfo[]

  constructor (private router: ClientRouter) {
    this.dsProxy = router.createProxy('ds')
  }

  ngOnInit() {
    this.selectTab(0)
  }

  selectTab(selected: number) {
    this.tab = selected

    //(service) -> load my-dataset list
    if (selected === 0)
      this.dsProxy.myDatasets().then(dsList => {
        this.myDataSets = dsList
        dsList.forEach(_ => { if (_.isDefault) this.defaultDataset = _ })
        
        setTimeout(_ => {
          let pBars: any = $('.ui.progress')
          pBars.progress()
          pBars.removeClass('active')
        }, 1)
      }).catch(error => toastr.error(error.message))

    //(service) -> load all-dataset list
    if (selected === 1)
        this.dsProxy.otherDatasets().then(dsList => {
          this.otherDataSets = dsList
        }).catch(error => toastr.error(error.message))
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
    this.defaultDataset.isDefault = false
    this.defaultDataset = ds
    this.defaultDataset.isDefault = true
    
    //(service) -> set my-default dataset
    this.dsProxy.setMyDefault(this.defaultDataset.id)
      .then(_ => toastr.success('Selected'))
      .catch(error => toastr.error(error.message))
  }

  subscribe() {
    let subsDatasets = this.otherDataSets.filter(_ => _.selected)

    //(service) -> subscribe to datasets
    this.dsProxy.subscribe(subsDatasets.map(_ => _.id))
      .then(_ => {
        this.allSelected = false
        this.selectedNumber = 0
        this.otherDataSets = this.otherDataSets.filter(_ => !_.selected)
        toastr.success('Subscribed')
      })
      .catch(error => toastr.error(error.message))
  }
}