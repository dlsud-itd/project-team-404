import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Placeholder for the streak pet on the Streak page. It has no data yet; the egg and the
 * "coming soon" text stand in until the pet is designed.
 */
@Component({
  selector: 'app-streak-pet',
  templateUrl: './streak-pet.html',
  styleUrl: './streak-pet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreakPet {}
