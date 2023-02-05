import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { DragToSelectModule } from 'ngx-drag-to-select';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    DragToSelectModule.forRoot()
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
