import { HttpErrorResponse } from '@angular/common/http';

export function folderError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Une erreur inattendue est survenue.';
  if (error.status === 0)
    return 'Réponse indisponible. Ta sélection est conservée ; vérifie l’état du dossier avant une nouvelle action.';
  if (error.status === 401) return 'Ta session n’est plus valide. Reconnecte-toi pour continuer.';
  if (error.status === 404)
    return 'Le dossier ou une recette n’est plus disponible. Actualise avant de poursuivre.';
  if (error.status === 409)
    return 'Nom déjà utilisé ou classement modifié ailleurs. Ta saisie est conservée : recharge explicitement avant une nouvelle intention.';
  if (error.status === 400) return 'Vérifie les informations saisies et les limites de sélection.';
  return 'Impossible de terminer cette action pour le moment. Tu peux réessayer.';
}
