import { ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { SelectContainerComponent } from 'ngx-drag-to-select';
import { Observable, ReplaySubject, firstValueFrom, map, switchMap, tap, timer } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  title = 'MapMaker';

  constructor() {
    this.initCheck();
  }
  private initCheck() {
    let maps = this.getMaps();
    if (maps.length == 0) this.currentMapSubject.next(this.createMap("base"));
    else this.loadMap(maps[0].id);
    this.change();
  }

  // Utils
  private getId(): string {
    return crypto.randomUUID();
  }
  private getRandomColor() {
    var letters = "0123456789ABCDEF";
    var color = "#";
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
  private getValueMapper(options: TileOption[]): any {
    let map: any = {};
    options.forEach(x => map[x.id] = x.value);
    return map;
  }

  // Selection & Assignment
  selectedTiles: TileWrapper[] = [];
  @ViewChild(SelectContainerComponent) selectContainer!: SelectContainerComponent;
  public assignTile(option: TileOption) {
    console.log("here");
    if (this.editMode == false) return;
    this.selectedTiles.forEach(x => x.tile.tile = option.id);
    this.selectContainer.clearSelection();
    this.change();
  }
  public selectAll() {
    this.selectContainer.selectAll();
  }
  public clearSelection() {
    this.selectContainer.clearSelection();
  }
  public clearAssignment() {
    this.selectedTiles.forEach(x => x.tile.tile = null);
    this.selectContainer.clearSelection();
    this.change();
  }

  // Move
  maxMapSize = 300;
  visibleMapSize = 10;
  visibleMapX = 0;
  visibleMapY = 0;
  public move(x: number, y: number) {
    this.moveMap(x, y);
  }
  public fullMove(x: number, y: number) {
    this.moveMap(x * this.visibleMapSize, y * this.visibleMapSize);
  }
  public maxMove(x: number, y: number) {
    this.moveMap(Number.MAX_SAFE_INTEGER * x, y * Number.MAX_SAFE_INTEGER);
  }
  private async moveMap(x: number, y: number) {
    this.MoveMapTo(this.visibleMapX + x, this.visibleMapY + y)
  }
  private async MoveMapTo(x: number, y: number) {
    this.visibleMapX = x;
    this.visibleMapY = y;
    let map = await this.currentMap();
    if (this.visibleMapX < 0) this.visibleMapX = 0;
    else if (this.visibleMapX + this.visibleMapSize >= map.info.width) this.visibleMapX = map.info.width - this.visibleMapSize;
    if (this.visibleMapY < 0) this.visibleMapY = 0;
    else if (this.visibleMapY + this.visibleMapSize >= map.info.height) this.visibleMapY = map.info.height - this.visibleMapSize;
    this.change();
  }


  async changeSize() {
    let map = await this.currentMap();

    let { value: width } = await Swal.fire({
      title: 'Enter a new width',
      input: 'number',
      inputValue: map.info.width,
    });
    if (!width) return;
    width = +width;

    let { value: height } = await Swal.fire({
      title: 'Enter a new height',
      input: 'number',
      inputValue: map.info.height,
    });
    if (!height) return;
    height = +height;

    // Same as current
    if (width == map.info.width && height == map.info.height) return;
    // Small than visible map size
    else if (width < this.visibleMapSize || height < this.visibleMapSize) {
      Swal.fire(`Values cannot be lower than ${this.visibleMapSize}`);
      return;
    }
    else if (width > this.maxMapSize || height > this.maxMapSize) {
      Swal.fire(`Values cannot be higher than ${this.maxMapSize} due to browser string size limit`);
      return;
    }
    // Smaller than current confirmation
    else if (width < map.info.width || height < map.info.height) {
      let { value: confirm } = await Swal.fire({
        title: 'Change map size',
        input: 'checkbox',
        inputValue: 0,
        inputPlaceholder:
          '<pre>The given size is lower than the current size.\nThis will delete any tiles that exceed the size.\nAre you certain you wish to continue?</pre>',
        confirmButtonText:
          'Confirm'
      })
      if (confirm == false) return;
    }
    // Scale map
    this.scaleMapSize(map, width, height);
  }

  @ViewChild('canvas', { static: true })
  canvas!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  ngAfterViewInit() {
    this.ctx = this.canvas.nativeElement.getContext('2d')!;
  }

  public async resetMap() {
    const { value: accept } = await Swal.fire({
      title: 'Reset map',
      input: 'checkbox',
      inputValue: 0,
      inputPlaceholder:
        'I am certain that I want to reset all the tiles.',
      confirmButtonText:
        'Confirm'
    });

    if (accept) {
      Swal.fire('Map was reset!', "", "success");
      let map = await this.currentMap();
      map.tiles.forEach(x => x.tile = null);
      this.change();
    }
    else {
      Swal.fire('Map was not reset!', "", "error");
    }
  }

  public async createNewMap() {
    let { value: name } = await Swal.fire({
      title: 'Enter a name',
      input: 'text',
      showCancelButton: true,
    });

    if (name) {
      let map = this.createMap(name);
      this.saveMap(map);
    }
  }
  private createMap(name: string): Map {
    return {
      info: {
        name: name,
        id: this.getId(),
        width: 10,
        height: 10,
      },
      options: [this.createOption()],
      tiles: this.generateMap(10, 10)
    };
  }
  private generateMap(width: number, height: number): Tile[] {
    let tiles: Tile[] = [];
    for (let y = 0; y < width; y++) {
      for (let x = 0; x < height; x++) {
        tiles.push({ x: x, y: y, tile: null });
      }
    }
    return tiles;
  }
  private generateAndCopyMap(width: number, height: number, original: Tile[]): Tile[] {
    let tiles: Tile[] = [];
    for (let y = 0; y < width; y++) {
      for (let x = 0; x < height; x++) {
        let tile = original.find(tile => tile.x == x && tile.y == y);
        if (tile) tiles.push(tile);
        else tiles.push({ x: x, y: y, tile: null });
      }
    }
    return tiles;
  }
  private scaleMapSize(map: Map, width: number, height: number) {
    map.info.width = width;
    map.info.height = height;
    map.tiles = this.generateAndCopyMap(width, height, map.tiles);
    this.change();
  }
  private createOption(): TileOption {
    let id = this.getId();
    return { id: id, value: 0, name: `Tile ${id}`, color: this.getRandomColor() };
  }
  private createOptions(values: any): TileOption[] {
    return Object.keys(values).map(key => ({ id: this.getId(), value: values[key], name: key, color: this.getRandomColor() }));
  }
  public async addOption() {
    let map = await this.currentMap();
    map.options.push(this.createOption());
  }
  public async importOptions() {
    let { value: optionsJSON } = await Swal.fire({
      title: 'Enter the options in JSON format',
      input: 'text',
      showCancelButton: true,
    });

    if (optionsJSON) {
      let parsedOptions;
      try {
        parsedOptions = JSON.parse(optionsJSON);
      } catch (error) {
        Swal.fire(
          'Failed import!',
          'Invalid JSON format',
          'warning'
        );
      }
      if (Object.values(parsedOptions).some(x => typeof x != "number")) {
        Swal.fire(
          'Failed import!',
          'Non numeric values are invalid',
          'warning'
        );
      }
      let map = await this.currentMap();
      let options = this.createOptions(parsedOptions);
      options.forEach(opt => {
        let value = map.options.find(x => x.value == opt.value)
        if (value) {
          opt.id = value.id;
        }
      });
      map.options = options;
      this.change();
    }
  }
  public async removeOption(option: TileOption) {
    let map = await this.currentMap();
    let optionUses = map.tiles.filter(tile => tile.tile == option.id);
    if (optionUses.length > 0) {
      const { value: accept } = await Swal.fire({
        title: 'Remove option',
        input: 'checkbox',
        inputValue: 0,
        inputPlaceholder: 'The option is used on the map. I am certain that I want to remove the option.',
        confirmButtonText: 'Confirm'
      });
      if (accept == false) return;
      optionUses.forEach(tile => tile.tile = null);
    }
    map.options = map.options.filter(tile => tile.id != option.id);
    this.change();
  }


  public async loadSavedMap() {
    var maps = this.getMaps();
    if (maps.length == 0) {
      Swal.fire("There are no saved maps");
      return;
    }
    var options: any = {};
    maps.forEach(m => options[m.name] = m.name);

    const { value: map } = await Swal.fire({
      title: 'Load map',
      input: 'select',
      inputOptions: options,
      inputPlaceholder: 'Select a map',
      showCancelButton: true,
      inputValidator: (value) => {
        return new Promise((resolve) => {
          if (value === "") {
            resolve('Please select a map to load')
          }
          else {
            resolve(null);
          }
        })
      }
    });

    if (map) {
      let id = maps.find(x => x.name == map)!.id;
      this.loadMap(id);
      Swal.fire(`${map} loaded`);
    }
  }

  currentMapSubject = new ReplaySubject<Map>(1);
  currentMap$: Observable<Map> = this.currentMapSubject.asObservable();

  async currentMap(): Promise<Map> {
    return firstValueFrom(this.currentMap$);
  }

  changeSubject = new ReplaySubject<null>(1);
  change$ = this.changeSubject.asObservable();

  filteredTiles$: Observable<TileWrapper[]> = this.change$.pipe(
    switchMap(x => this.currentMap$),
    tap(x => this.updateCanvas(x)),
    map(x => this.filterTiles(x)),
  );
  private SAVE_DELAY = 10000;
  saveTimer$ = timer(this.SAVE_DELAY, this.SAVE_DELAY).pipe(
    tap(x => this.save())
  );

  private updateCanvas(map: Map) {
    if (this.ctx == null) this.ctx = this.canvas.nativeElement.getContext('2d')!;
    this.canvas.nativeElement.width = map.info.width;
    this.canvas.nativeElement.height = map.info.height;
    this.ctx.clearRect(0, 0, map.info.width, map.info.height)
    map.tiles.forEach(x => {
      if (x.tile) {
        this.ctx.fillStyle = map.options.find(y => y.id == x.tile)?.color!;
        this.ctx.fillRect(x.x, x.y, 1, 1);
      }
    });
  }
  private filterTiles(map: Map): TileWrapper[] {
    let filteredTiles = map.tiles.filter(tile => tile.x >= this.visibleMapX && tile.x < this.visibleMapX + this.visibleMapSize && tile.y >= this.visibleMapY && tile.y < this.visibleMapY + this.visibleMapSize);
    let wrappedTiles = filteredTiles.map(tile => ({ tile, option: map.options.find(o => o.id == tile.tile) }) as TileWrapper);
    return wrappedTiles;
  }
  private change() {
    this.changeSubject.next(null);
  }
  private async save() {
    let map = await this.currentMap();
    this.saveMap(map);
  }
  moveTest(event: any) {
    // Pixel cords of mouse click (offsetted within the canvas) / the canvas size in pixels * the size of the canvas (=map size)
    let y = Math.floor(event.offsetY / this.canvas.nativeElement.clientHeight * this.canvas.nativeElement.height);
    let x = Math.floor(event.offsetX / this.canvas.nativeElement.clientWidth * this.canvas.nativeElement.width);
    // Offset it by half visible map size because it uses top left corner
    x -= this.visibleMapSize / 2;
    y -= this.visibleMapSize / 2;
    this.MoveMapTo(x, y)
  }

  editMode = true;
  public toggleEdit() {
    this.editMode = !this.editMode;
  }

  // Storage
  private MAPS_STORAGE = "MAPS";
  private getMaps(): MapInfo[] {
    return JSON.parse(localStorage.getItem(this.MAPS_STORAGE)!) ?? [];
  }
  private loadMap(id: string) {
    let map = JSON.parse(localStorage.getItem(id)!);
    this.currentMapSubject.next(map);
  }
  private saveMap(map: Map) {
    this.saveMapInfo(map.info);
    localStorage.setItem(map.info.id, JSON.stringify(map));
  }
  private saveMapInfo(mapInfo: MapInfo) {
    let maps = this.getMaps();
    maps = maps.filter(x => x.id != mapInfo.id);
    maps.push(mapInfo);
    localStorage.setItem(this.MAPS_STORAGE, JSON.stringify(maps));
  }

  // Export
  public async exportCurrentMap() {
    Swal.fire(
      'Map exported!',
      'A download should start with the exported map!',
      'success'
    );
    let map = await this.currentMap();
    let mapper = this.getValueMapper(map.options);
    let tiles = map.tiles.map(x => ({ x: x.x, y: x.y, value: mapper[x.tile!] ?? 0 }))
    this.exportMap(map.info.name, tiles);
  }
  private exportMap(name: string, object: any | any[]) {
    let json = JSON.stringify(object);
    let element = document.createElement('a');
    element.setAttribute('href', "data:text/json;charset=UTF-8," + encodeURIComponent(json));
    element.setAttribute('download', `${name}.json`);
    element.click();
  }

  // Keybinds
  @HostListener('document:keydown', ['$event'])
  keyBinds(btn: any) {
    switch (btn.code) {
      case "ArrowUp":
        this.keyBindMoveMethod(0, -1);
        break;
      case "ArrowDown":
        this.keyBindMoveMethod(0, 1);
        break;
      case "ArrowRight":
        this.keyBindMoveMethod(1, 0);
        break;
      case "ArrowLeft":
        this.keyBindMoveMethod(-1, 0);
        break;
      default:
        break;
    }
  }

  // Settings
  keepSelectedOnAssign = false;
  keyBindMoveMethod = this.move;
  public openSettings() {
    this.keepSelectedOnAssign = false;
    if (true) this.keyBindMoveMethod = this.move;
    else this.keyBindMoveMethod = this.fullMove;
  }
}

interface Map {
  info: MapInfo;
  options: TileOption[];
  tiles: Tile[];
}
interface MapInfo {
  id: string;
  name: string;
  width: number;
  height: number;
}
interface Tile {
  x: number;
  y: number;
  tile: string | null;
}
interface TileOption {
  id: string;
  name: string
  value: any;
  color: string;
}
interface TileWrapper {
  tile: Tile;
  option: TileOption;
}