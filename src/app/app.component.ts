import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'MapMaker';

  visibleMapSize = 10;
  visibleMapX = 0;
  visibleMapY = 0;

  tiles: Tile[] = [];
  visibleTiles: Tile[] = [];


  totalMapSizeX = 100;
  totalMapSizeY = 100;

  constructor() {
    for (let y = 0; y < this.totalMapSizeY; y++) {
      for (let x = 0; x < this.totalMapSizeX; x++) {
        this.tiles.push({ x: x, y: y, type: 1 })
      }
    }
    this.filterTiles();
  }

  filterTiles() {
    this.visibleTiles = this.tiles.filter(tile => tile.x >= this.visibleMapX && tile.x < this.visibleMapX + this.visibleMapSize && tile.y >= this.visibleMapY && tile.y < this.visibleMapY + this.visibleMapSize);
  }

  move(x: number, y: number) {
    this.moveMap(x, y);
    this.filterTiles();
  }
  maxMove(x: number, y: number) {
    this.moveMap(x * this.visibleMapSize, y * this.visibleMapSize);
    this.filterTiles();
  }

  selectedTiles = []

  log(x: any) {
    console.log(x);
  }

  private moveMap(x: number, y: number) {
    this.visibleMapX += x;
    this.visibleMapY += y;
    if (this.visibleMapX < 0) this.visibleMapX = 0;
    else if (this.visibleMapX >= this.totalMapSizeX) this.visibleMapX = this.totalMapSizeX - this.visibleMapSize;
    if (this.visibleMapY < 0) this.visibleMapY = 0;
    else if (this.visibleMapY >= this.totalMapSizeY) this.visibleMapY = this.totalMapSizeY - this.visibleMapSize;
  }
}
interface Tile {
  x: number;
  y: number;
  type: number;
}