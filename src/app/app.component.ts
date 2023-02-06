import { Component, ElementRef, ViewChild } from '@angular/core';

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


  selectedTiles = []

  log(x: any) {
    console.log(x);
  }

  public move(x: number, y: number) {
    this.moveMap(x, y);
    this.filterTiles();
  }
  public fullMove(x: number, y: number) {
    this.moveMap(x * this.visibleMapSize, y * this.visibleMapSize);
    this.filterTiles();
  }
  public maxMove(x: number, y: number) {
    this.moveMap(Number.MAX_SAFE_INTEGER * x, y * Number.MAX_SAFE_INTEGER);
    this.filterTiles();
  }
  private moveMap(x: number, y: number) {
    this.visibleMapX += x;
    this.visibleMapY += y;
    if (this.visibleMapX < 0) this.visibleMapX = 0;
    else if (this.visibleMapX + this.visibleMapSize >= this.totalMapSizeX) this.visibleMapX = this.totalMapSizeX - this.visibleMapSize;
    if (this.visibleMapY < 0) this.visibleMapY = 0;
    else if (this.visibleMapY + this.visibleMapSize >= this.totalMapSizeY) this.visibleMapY = this.totalMapSizeY - this.visibleMapSize;
    this.drawPositionRect()
  }

  @ViewChild('canvas', { static: true })
  canvas!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  ngOnInit(): void {
    this.ctx = this.canvas.nativeElement.getContext('2d')!;
  }
  drawPositionRect() {
    this.ctx.clearRect(0, 0, 100, 100)
    this.ctx.fillRect(this.visibleMapX, this.visibleMapY, 10, 10);
  }

  canvasX = 100;
  canvasY = 100;
  changeCanvasSize() {
    this.canvasX = 300;
    this.canvasY = 300;
  }
}
interface Tile {
  x: number;
  y: number;
  type: number;
}

interface TileOption {
  value: any;
  name: string
  color: string;
}