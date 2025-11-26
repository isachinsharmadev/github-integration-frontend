// src/app/components/integration/integration.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GithubService } from '../../services/github.service';

@Component({
  selector: 'app-integration',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './integration.component.html',
  styleUrls: ['./integration.component.css'],
})
export class IntegrationComponent implements OnInit {
  isConnected = false;
  isLoading = true;
  integration: any = null;
  panelOpenState = false;

  constructor(
    private githubService: GithubService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Check for OAuth callback params
    this.route.queryParams.subscribe((params) => {
      if (params['success']) {
        this.snackBar.open('GitHub integration successful!', 'Close', {
          duration: 3000,
        });
        this.router.navigate([], { queryParams: {} });
      } else if (params['error']) {
        this.snackBar.open('GitHub integration failed', 'Close', {
          duration: 3000,
        });
        this.router.navigate([], { queryParams: {} });
      }
    });

    this.checkIntegrationStatus();
  }

  checkIntegrationStatus(): void {
    this.isLoading = true;
    this.githubService.getIntegrationStatus().subscribe({
      next: (response) => {
        this.isConnected = response.connected;
        this.integration = response.integration;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error checking status:', error);
        this.isLoading = false;
      },
    });
  }

  connect(): void {
    this.githubService.initiateAuth();
  }

  removeIntegration(): void {
    if (
      confirm(
        'Are you sure you want to remove this integration? All synced data will be deleted.'
      )
    ) {
      this.githubService.removeIntegration().subscribe({
        next: () => {
          this.snackBar.open('Integration removed successfully', 'Close', {
            duration: 3000,
          });
          this.isConnected = false;
          this.integration = null;
          this.panelOpenState = false;
        },
        error: (error) => {
          console.error('Error removing integration:', error);
          this.snackBar.open('Failed to remove integration', 'Close', {
            duration: 3000,
          });
        },
      });
    }
  }

  resyncIntegration(): void {
    this.githubService.resyncIntegration().subscribe({
      next: () => {
        this.snackBar.open(
          'Resync started. This may take a few minutes.',
          'Close',
          { duration: 3000 }
        );
        this.checkIntegrationStatus();
      },
      error: (error) => {
        console.error('Error resyncing:', error);
        this.snackBar.open('Failed to resync integration', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  viewData(): void {
    this.router.navigate(['/data']);
  }
}
