import { HttpErrorResponse } from '@angular/common/http';

export function folderError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Une erreur inattendue est survenue.';
  if (error.status === 0)
    return 'Impossible de joindre Barbook. Tu peux réessayer sans perdre ta saisie.';
  if (error.status === 401) return 'Ta session n’est plus valide. Reconnecte-toi pour continuer.';
  if (error.status === 404)
    return 'Le dossier ou une recette n’est plus disponible. Actualise avant de poursuivre.';
  if (error.status === 409)
    return 'Nom déjà utilisé ou dossier modifié ailleurs. Ta saisie est conservée : choisis un autre nom ou recharge le dossier.';
  if (error.status === 400) return 'Vérifie les informations saisies et les limites de sélection.';
  return 'Impossible de terminer cette action pour le moment. Tu peux réessayer.';
}
