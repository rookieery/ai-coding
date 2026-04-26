import { describe, it, expect } from 'vitest';
import { parseMoveText } from '../moveParser';

describe('parseMoveText', () => {
  it('should parse uppercase coordinate like H8', () => {
    const result = parseMoveText('H8');
    expect(result).toEqual({ r: 7, c: 7, coord: 'H8' });
  });

  it('should parse lowercase coordinate like h8', () => {
    const result = parseMoveText('h8');
    expect(result).toEqual({ r: 7, c: 7, coord: 'H8' });
  });

  it('should parse coordinate with Chinese prefix "落子"', () => {
    const result = parseMoveText('落子 H8');
    expect(result).toEqual({ r: 7, c: 7, coord: 'H8' });
  });

  it('should parse coordinate with Chinese prefix "下"', () => {
    const result = parseMoveText('下 h8');
    expect(result).toEqual({ r: 7, c: 7, coord: 'H8' });
  });

  it('should parse edge coordinate A1', () => {
    const result = parseMoveText('A1');
    expect(result).toEqual({ r: 14, c: 0, coord: 'A1' });
  });

  it('should parse edge coordinate O15', () => {
    const result = parseMoveText('O15');
    expect(result).toEqual({ r: 0, c: 14, coord: 'O15' });
  });

  it('should return null for invalid text', () => {
    expect(parseMoveText('hello')).toBeNull();
    expect(parseMoveText('P8')).toBeNull(); // P is out of range
    expect(parseMoveText('H16')).toBeNull(); // 16 is out of range
    expect(parseMoveText('')).toBeNull();
  });

  it('should handle whitespace correctly', () => {
    const result = parseMoveText('  落子   h8  ');
    expect(result).toEqual({ r: 7, c: 7, coord: 'H8' });
  });
});
