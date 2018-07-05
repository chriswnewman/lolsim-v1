import { Champion } from './champion';
import { ItemSet } from './item-set';

export class Build {
  champion: Champion;
  itemSet: ItemSet;

  constructor() {}

  setChampion(champ: Champion) {
    this.champion = champ;
  }

  getChampion(): Champion {
    return this.champion;
  }
}