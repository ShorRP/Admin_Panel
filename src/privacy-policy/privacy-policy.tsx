import type { ReactNode } from "react"

import { PublicPageFrame } from "@/staff/public-page-frame"
import { OrnamentRule } from "@/ui/ornament-rule"
import { PageHeader } from "@/ui/page-header"

const LAST_UPDATED = "2026-11-02"

const lastUpdatedDay = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeZone: "Europe/Paris",
})

export function PrivacyPolicy() {
  return (
    <PublicPageFrame note="Panel du staff de Shor" privacyPolicyCurrent>
      <main className="flex flex-1 flex-col gap-8 py-12">
        <div className="flex flex-col gap-5.5">
          <PageHeader
            overline="Panel du staff · Skyrim Roleplay"
            title="Politique de confidentialité"
          >
            Ce que le panel du staff de Shor lit, garde et écrit sur les comptes
            Discord, pourquoi, combien de temps, qui le voit, et comment
            demander à le corriger ou à l’effacer.
          </PageHeader>
          <p className="text-sm text-muted-foreground">
            Mise à jour le{" "}
            <time dateTime={LAST_UPDATED}>
              {lastUpdatedDay.format(new Date(LAST_UPDATED))}
            </time>
            .
          </p>
          <OrnamentRule leadingLine />
        </div>
        <PolicySection title="Ce que couvre cette page">
          <p>
            Le panel est l’application web où le staff de Shor administre le
            serveur Discord de Shor : ses mots interdits, son journal d’audit et
            les sanctions des comptes. Il agit sur Discord par son application
            Discord, « Shor Panel ». Cette politique couvre aussi « Shor Panel
            Dev », la seconde application sur laquelle le panel est développé et
            essayé, sur un serveur Discord de test.
          </p>
        </PolicySection>
        <PolicySection title="Ce que le panel garde">
          <p>
            Le panel n’a pas de base de données. Il ne garde qu’une donnée :
            l’ID Discord du membre du staff connecté, dans un cookie chiffré et
            signé,{" "}
            <code className="font-mono wrap-anywhere">__Host-session</code>, sur
            son seul navigateur, 7 jours au plus, pour qu’il reste connecté. Se
            déconnecter efface ce cookie.
          </p>
        </PolicySection>
        <PolicySection title="Ce que le panel lit sans le garder">
          <p>
            À chaque page, le panel lit sur Discord ce qu’il montre au staff, et
            n’en garde rien :
          </p>
          <PolicyList>
            <li>le nom et l’avatar du membre du staff connecté ;</li>
            <li>
              dans le journal d’audit, le membre du staff derrière chaque
              changement, le compte que vise chaque exclusion temporaire,
              expulsion ou bannissement, ou dont l’exclusion temporaire ou le
              bannissement est levé, avec son motif, et le compte qu’AutoMod
              exclut temporairement quand un de ses messages enfreint une de ses
              règles, avec le nom de cette règle ;
            </li>
            <li>
              pour le staff qui modère, la liste des comptes : chaque membre du
              serveur Discord et chaque compte banni, avec son nom, son avatar,
              sa situation sur le serveur, la fin de son exclusion temporaire,
              et le nom et la couleur du rôle le plus haut d’un membre, ainsi
              que les rôles du serveur Discord, la date d’arrivée de chaque
              membre sur le serveur et l’âge de chaque compte Discord, par
              lesquels le staff qui modère trie et filtre cette liste ;
            </li>
            <li>
              pour le staff qui modère, la fiche d’un compte : ses noms, son
              avatar, ses rôles, ses dates, sa situation sur le serveur et les
              entrées du journal d’audit de Discord qui le concernent.
            </li>
          </PolicyList>
          <p>
            Pour lire tous les membres, l’application du panel a, sur Discord,
            l’accès privilégié aux membres du serveur, le « Server Members
            Intent ». Elle ne se connecte pas à la passerelle de Discord, et ne
            reçoit donc aucun événement sur les membres.
          </p>
          <p>
            L’adresse d’une fiche contient l’ID du compte, et celles de la liste
            des comptes et du journal d’audit, le texte cherché, un nom, un ID
            ou une mention, et les filtres choisis : l’historique du navigateur
            les garde, comme toute adresse.
          </p>
        </PolicySection>
        <PolicySection title="Ce que le panel écrit dans Discord">
          <p>
            Quand le staff agit depuis le panel, Discord garde ce que le panel
            lui écrit, et le panel n’en garde aucune copie :
          </p>
          <PolicyList>
            <li>
              chaque changement porte un motif qui nomme le membre du staff qui
              l’a fait, son nom et son ID, et que le journal d’audit de Discord
              garde 45 jours ;
            </li>
            <li>
              une exclusion temporaire inscrit sa fin sur le membre et son motif
              dans le journal d’audit, et une expulsion son seul motif dans le
              journal d’audit ;
            </li>
            <li>
              un bannissement inscrit aussi son motif dans la liste des bannis
              du serveur Discord, où il reste tant que dure le bannissement, et
              peut faire effacer par Discord les messages du compte, de la
              dernière heure aux 7 derniers jours, au choix du staff ;
            </li>
            <li>
              une sanction peut envoyer au membre un message privé qui la
              reprend avec son motif : il reste dans la conversation entre
              l’application du panel et le membre, tant que l’application ne
              l’efface pas.
            </li>
          </PolicyList>
        </PolicySection>
        <PolicySection title="Pourquoi">
          <p>
            Le panel lit et écrit ces données pour que le staff de Shor
            administre le serveur Discord : qu’il tienne ses mots interdits,
            sache qui a changé quoi, sanctionne un compte ou lève sa sanction.
            Le cookie sert à garder le membre du staff connecté.
          </p>
        </PolicySection>
        <PolicySection title="Qui le voit">
          <p>
            Le panel ne s’ouvre qu’au staff de Shor, après une connexion avec
            Discord, et vérifie à chaque page que le membre a toujours le rôle
            staff. Tout le staff voit le journal d’audit ; seul le staff qui
            modère voit la liste des comptes et leurs fiches.
          </p>
        </PolicySection>
        <PolicySection title="Qui d’autre y touche">
          <p>
            Discord, où vivent les données que le panel lit et écrit, et Vercel,
            qui héberge le panel. Le panel n’écrit dans ses journaux et ses
            alertes ni l’ID, ni le nom, ni l’adresse IP d’un membre, et Vercel
            garde ces journaux une heure. Comme tout hébergeur, Vercel reçoit
            l’adresse IP de chaque visiteur, et son pare-feu compte les requêtes
            de chaque adresse pour en limiter le nombre.
          </p>
        </PolicySection>
        <PolicySection title="Tes droits">
          <p>
            Tu peux demander à accéder aux données qui te concernent, à les
            faire corriger ou à les faire effacer. Un membre du staff efface
            lui-même son cookie de session en se déconnectant.
          </p>
        </PolicySection>
        <PolicySection title="Responsable et contact">
          <p>
            Le responsable de ces données et l’adresse où lui écrire restent à
            désigner. En attendant, adresse ta demande au staff de Shor, sur le
            serveur Discord de Shor.
          </p>
        </PolicySection>
      </main>
    </PublicPageFrame>
  )
}

function PolicySection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3 text-[0.9375rem] leading-6 text-pretty">
      <h2 className="font-heading text-[1.375rem] leading-[1.2] font-medium">
        {title}
      </h2>
      {children}
    </section>
  )
}

function PolicyList({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-5">{children}</ul>
}
