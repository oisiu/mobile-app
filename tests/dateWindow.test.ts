import { describe,expect,it } from 'vitest';
import { homeDateWindow } from '../src/features/home/dateWindow';

describe('Home native date timeline',()=>{
  it('starts at today without rendering future columns',()=>{
    expect(homeDateWindow(0,60)).toEqual({start:0,end:10});
  });
  it('keeps the visible days mounted with overscan during long or fast scrolls',()=>{
    expect(homeDateWindow(25,60)).toEqual({start:20,end:35});
    expect(homeDateWindow(52,60)).toEqual({start:47,end:60});
  });
  it('preserves the historical window when earlier days are appended',()=>{
    expect(homeDateWindow(45,60)).toEqual(homeDateWindow(45,90));
  });
});
