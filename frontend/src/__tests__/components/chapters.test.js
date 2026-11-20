/**
 * Tests for the Players chapter registry (which card rows lead to which chapter).
 */
import { CHAPTERS, chapterById, chapterForRow, chapterForSection, chapterPath } from '../../components/PlayersPage/chapters';
import { CHAPTER_CONTENT } from '../../components/PlayersPage/chapterContent';
import { CHAPTER_CODE } from '../../components/PlayersPage/chapterCode';

describe('Players chapters', () => {
  it('has unique ids and paths', () => {
    const ids = CHAPTERS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(chapterPath('pace')).toBe('/players/pace');
  });

  it('marks which chapters are written so far', () => {
    expect(CHAPTERS.filter(c => c.status === 'ready').map(c => c.id)).toEqual(['standard-stats', 'touches', 'pace', 'time-on-ball', 'tempo-and-technique', 'action-volume', 'phone-booth', 'free-space', 'ball-holding', 'goal-side', 'flip-side', 'great-actions']);
    expect(CHAPTERS.filter(c => c.status === 'soon')).toEqual([]);
  });

  it('sends single rows to their own chapter', () => {
    expect(chapterForRow('How he plays', 'Actions at 15+ km/h (pace)')).toBe('pace');
    expect(chapterForRow('How he plays', 'Touches per 90')).toBe('touches');
    expect(chapterForRow('Technique', 'Chances from free space, per 90')).toBe('free-space');
    expect(chapterForRow('Technique', 'First touch kept')).toBe('tempo-and-technique');
  });

  it('sends whole sections to a chapter', () => {
    expect(chapterForSection('Phone booth')).toBe('phone-booth');
    expect(chapterForSection('Flip side and recoveries')).toBe('flip-side');
    expect(chapterForRow('Phone booth', 'Lost')).toBe('phone-booth');
  });

  it('every chapter a card row can point to exists', () => {
    const titles = ['Standard stats', 'What the game gave him', 'Technique', 'Action volume', 'Phone booth',
      'Free space', 'Ball holding', 'Goal-side', 'Flip side and recoveries'];
    titles.forEach(t => expect(chapterById(chapterForSection(t))).toBeDefined());
  });

  it('has no row listed under two chapters', () => {
    const all = CHAPTERS.flatMap(c => c.covers);
    expect(new Set(all).size).toBe(all.length);
  });

  it('gives every drafted chapter its text and its code', () => {
    CHAPTERS.filter(c => c.status === 'draft' && c.id !== 'great-actions').forEach(c => {
      const content = CHAPTER_CONTENT[c.id];
      expect(content).toBeDefined();
      c.covers.forEach(row => expect(content.means[row]).toBeTruthy());
      expect(content.measured.length).toBeGreaterThan(0);
      expect(CHAPTER_CODE[c.id].length).toBeGreaterThan(0);
    });
    expect(CHAPTER_CODE['great-actions'].length).toBeGreaterThan(0);
  });
});
