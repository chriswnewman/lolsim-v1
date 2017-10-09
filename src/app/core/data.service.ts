import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/toPromise';
import { Champion } from 'app/classes/champion';
import { Stats } from 'app/classes/stats';
import { Spell } from 'app/classes/spell';
import { Item } from 'app/classes/item';
import { Rune } from 'app/classes/rune';
import { Mastery } from 'app/classes/mastery';
import { SortService } from 'app/core/sort.service';
import { MendService } from 'app/core/mend.service';
// TO DO: look into grouping imports from classes directory into a barrel

@Injectable()
export class DataService {
  apiRoot: string;
  dataVersion: string;
  champions: Map<string, Champion>;
  items: Map<string, Item>;
  itemTree: Array<Object>;
  masteries: Map<string, Mastery>;
  runes: Map<string, Rune>;
  loading: boolean;
  testApi: string;
  search: URLSearchParams;

  // temp data flag
  tempDataFlag: boolean;

  constructor(private http: HttpClient, protected sort: SortService, protected mend: MendService) {
    this.apiRoot = 'http://73.134.84.72:10101';
    // this.apiRoot = 'http://localhost:3001';
    this.loading = false;

    this.tempDataFlag = true;
    if (this.tempDataFlag) {
      console.warn('!!!USING TEMP DATA FOR OFFLINE DEVELOPMENT!!!');
      this.apiRoot = './assets/temp-data/';
    }
  }


  // populate Champion array with initial data
  private getChampions() {
    // console.log('get champions called');
    // console.log('getChampions() called');
    const promise = new Promise((resolve, reject) => {
      if (!this.champions) {

        let searchParams = new HttpParams();
        let url = this.apiRoot;

        if (!this.tempDataFlag) {
          // const champDataParams = ['image', 'passive', 'spells', 'stats', 'tags'];
          url += '/static/champions';
          searchParams.set('champData', 'all'); // using 'all' until Rito fixes their shit
        }
        else {
          url += 'champions.json';
        }

        // console.log('http call for getChampions');
        this.http.get(url, { params: searchParams })
          .toPromise()
          .then(json => {
            console.log('get champions success .then');

            let temp = new Map<string, Champion>();
            // const json = res.json();
            // const json = JSON.parse(res.toString());
            this.mend.mendChampData(json);
            this.dataVersion = json['version'];
            for (const champ in json['data']) {
              if (json['data'].hasOwnProperty(champ)) {
                // get stats data
                let ritoStats = new Stats(json['data'][champ].stats);
                //get spells data
                const ritoSpells = new Array<Spell>();
                for (let i = 0; i < json['data'][champ].spells.length; i++) {

                  let tempSpell = new Spell(json['data'][champ].spells[i]);
                  tempSpell = this.mend.mendSpell(tempSpell);
                  // ritoSpells.push(tempSpell);

                  ritoSpells.push(tempSpell);

                  // ritoSpells.push(this.mend.mendSpell(new Spell(json['data'][champ].spells[i])));
                }

                // add champ key to map
                temp.set(json['data'][champ].key, new Champion(json['data'][champ].key,
                  json['data'][champ].name,
                  json['data'][champ].title,
                  json['data'][champ].passive,
                  ritoSpells,
                  ritoStats));
              }
            }
            console.log('storing sorted array of champions in map...');
            this.champions = new Map<string, Champion>(Array.from(temp).sort(this.sort.ascendingChampMap));
            resolve();
          })
          .catch(err => {
            console.log('error');
            console.log(err);
          });
      };
      // resolve();
    });
    return promise;
  };

  // get runes
  private getRunes() {
    // console.log('get runes called');
    const promise = new Promise((resolve, reject) => {
      if (!this.runes) {
        let searchParams = new HttpParams();
        let url = this.apiRoot;
        if (!this.tempDataFlag) {
          // const champDataParams = ['image', 'passive', 'spells', 'stats', 'tags'];
          url += '/static/runes';
          searchParams.set('runeData', 'stats'); // using 'all' until Rito fixes their shit
        }
        else {
          url += 'runes.json';
        }
        // console.log('http call for getRunes');
        this.http.get(url, { params: searchParams })
          .toPromise()
          .then(json => {
            let temp = new Map<string, Rune>();
            // const json = res.json();
            console.log(json);
            this.dataVersion = json['version'];
            for (const rune in json['data']) {
              if (json['data'].hasOwnProperty(rune)) {
                // exclude some of the data, we only want t3 runes
                if (json['data'][rune].rune.tier === '3') {
                  temp.set('' + json['data'][rune].id, new Rune(json['data'][rune]));
                }
              }
            }
            // sort runes before putting them in
            this.runes = new Map<string, Rune>(Array.from(temp).sort(this.sort.ascendingRuneCategoryMap));
            console.log(this.runes.size);
            resolve();
          })
          .catch(err => {
            console.log('error');
            console.log(err);
          });
      };
      // resolve();
    });
    return promise;
  }

  // get items
  private getItems() {
    // console.log('get items called');
    const promise = new Promise((resolve, reject) => {
      if (!this.items) {
        let searchParams = new HttpParams();
        let url = this.apiRoot;

        if (!this.tempDataFlag) {
          searchParams.set('itemData', 'all')
          url += '/static/items';
        }
        else {
          url += 'items.json';
        }
        // console.log('http call for getItems');
        this.http.get(url, { params: searchParams })
          .toPromise()
          .then(json => {
            // console.log('get items success .then');
            let temp = new Map<string, Item>();
            // let json = res.json();

            this.mend.mendItemData(json);
            // TO DO: do something with itemTree
            this.itemTree = json['tree'];
            const ignoreItems = [3634, 3631, 3641, 3636, 3647, 3643, 3642, 3635,
              3640, 3007, 3008, 3029, 3073, 3671, 3672, 3673, 3674, 3675];

            for (const item in json['data']) {
              if (json['data'].hasOwnProperty(item)) {
                let x = json['data'][item];
                // TODO: move exclusion logic to mend service
                // if item is available on SR and is not champion specific
                if (x.maps['11'] && !x.requiredChampion && x.gold.purchasable && !ignoreItems.includes(x.id)) {
                  temp.set('' + json['data'][item].id, new Item(json['data'][item]));
                }

              }
            }
            // console.log(temp.size);
            this.items = new Map<string, Item>(Array.from(temp).sort(this.sort.ascendingGoldCostMap));
            // let doodoomap = new Map<string, Item>
            resolve();
          })
          .catch(err => {
            console.log('error');
            console.log(err);
            reject();
          });
      }
    });
    return promise;
  }

  // get masteries
  private getMasteries() {
    const promise = new Promise((resolve, reject) => {
      if (!this.masteries) {
        let searchParams = new HttpParams();
        let url = this.apiRoot;

        if (!this.tempDataFlag) {
          searchParams.set('masteryData', 'all')
          url += '/static/masteries';
        }
        else {
          url += 'masteries.json';
        }
        this.http.get(url, { params: searchParams })
          .toPromise()
          .then(json => {
            // console.log('get items success .then');
            let temp = new Map<string, Mastery>();
            // let json = res.json();
            // console.log(res.json());
            // TO DO: use mastery tree from json.tree

            for (const mastery in json['data']) {
              if (json['data'].hasOwnProperty(mastery)) {
                temp.set('' + json['data'][mastery].id, new Mastery(json['data'][mastery]));
              }
            }
            console.log(temp.size);
            this.masteries = new Map<string, Mastery>(Array.from(temp));
            resolve();
          })
          .catch(err => {
            console.log('error');
            console.log(err);
            reject();
          });
      }
    });
    return promise;
  }

  getData() {
    if (!this.dataVersion) {
      // const runeDataPromise = this.getRunes();
      const champDataPromise = this.getChampions();
      const itemDataPromise = this.getItems();
      // const masteryDataPromise = this.getMasteries();
      return Promise.all([champDataPromise, itemDataPromise]); //, runeDataPromise, masteryDataPromise]);
    }
  }

  getChampionByKey(champKey: string) {
    console.log('getChampByKey: ' + champKey);
    if (!this.dataVersion) {
      this.getData().then((values) => {
        return this.champions.get(champKey);
      });
    }
    return this.champions.get(champKey);
  };

  getItemById(itemId: string): Item {
    console.log('getItemById: ' + itemId);
    if (!this.dataVersion) {
      this.getData().then((values) => {
        return this.items.get(itemId);
      });
    }
    return this.items.get(itemId);
  }

  getRuneById(runeId: string): Rune {
    console.log('getRuneById: ' + runeId);
    if (!this.dataVersion) {
      this.getData().then((value) => {
        return this.runes.get(runeId);
      });
    }
    return this.runes.get(runeId);
  }

  getMasteryById(masteryId: string): Mastery {
    console.log('getMasteryById: ' + masteryId);
    if (!this.dataVersion) {
      this.getData().then((value) => {
        return this.masteries.get(masteryId);
      });
    }
    return this.masteries.get(masteryId);
  }

  getItemTree() {
    return this.itemTree;
  }

}