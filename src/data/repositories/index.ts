import { createCardRepository, type CardRepository } from '@/data/repositories/cardRepository';
import type { RepositoryDeps } from '@/data/repositories/deps';
import {
  createDictionaryRepository,
  type DictionaryRepository,
} from '@/data/repositories/dictionaryRepository';
import {
  createReviewLogRepository,
  type ReviewLogRepository,
} from '@/data/repositories/reviewLogRepository';
import {
  createSettingsRepository,
  type SettingsRepository,
} from '@/data/repositories/settingsRepository';
import { createTagRepository, type TagRepository } from '@/data/repositories/tagRepository';
import { createWordRepository, type WordRepository } from '@/data/repositories/wordRepository';

export interface Repositories {
  dictionaries: DictionaryRepository;
  words: WordRepository;
  tags: TagRepository;
  cards: CardRepository;
  reviewLogs: ReviewLogRepository;
  settings: SettingsRepository;
}

export type { RepositoryDeps };

export function createRepositories(deps: RepositoryDeps): Repositories {
  return {
    dictionaries: createDictionaryRepository(deps),
    words: createWordRepository(deps),
    tags: createTagRepository(deps),
    cards: createCardRepository(deps),
    reviewLogs: createReviewLogRepository(deps),
    settings: createSettingsRepository(deps),
  };
}
