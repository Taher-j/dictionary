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
  createReviewRepository,
  type ReviewRepository,
} from '@/data/repositories/reviewRepository';
import {
  createSettingsRepository,
  type SettingsRepository,
} from '@/data/repositories/settingsRepository';
import { createTagRepository, type TagRepository } from '@/data/repositories/tagRepository';
import { createTrashRepository, type TrashRepository } from '@/data/repositories/trashRepository';
import { createWordRepository, type WordRepository } from '@/data/repositories/wordRepository';

export interface Repositories {
  dictionaries: DictionaryRepository;
  words: WordRepository;
  tags: TagRepository;
  cards: CardRepository;
  reviewLogs: ReviewLogRepository;
  reviews: ReviewRepository;
  settings: SettingsRepository;
  trash: TrashRepository;
}

export type { RepositoryDeps };

export function createRepositories(deps: RepositoryDeps): Repositories {
  return {
    dictionaries: createDictionaryRepository(deps),
    words: createWordRepository(deps),
    tags: createTagRepository(deps),
    cards: createCardRepository(deps),
    reviewLogs: createReviewLogRepository(deps),
    reviews: createReviewRepository(deps),
    settings: createSettingsRepository(deps),
    trash: createTrashRepository(deps),
  };
}
