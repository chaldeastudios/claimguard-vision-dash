// Lookup catalogs needed to submit a claim: diagnoses (ICD codes) and the
// medical item/service pricelists. See openimis-client.server.ts for the
// shared auth/fetch plumbing this builds on.
//
// UNVERIFIED: the root query names (diagnoses/medicalItems/medicalServices)
// are confirmed to exist (seen in schema introspection), but their field
// selections here are a best-effort guess following the {code name} shape
// every other openIMIS lookup type in this schema has used. A wrong field
// name fails closed -- only this catalog fetch breaks, not claim
// reads/writes elsewhere. Deliberately not passing a search argument (its
// name isn't confirmed either) -- fetches one page and lets the UI filter
// client-side instead.
//
// Confirmed live: unlike Claim/HealthFacility (which expose both `uuid`
// and the Relay `id`), DiagnosisGQLType only has `id` -- querying `uuid`
// errors "Cannot query field \"uuid\"... Did you mean \"id\"?". Rather
// than special-case Diagnosis, this uses `id` alone for every catalog
// (medicalItems/medicalServices were never independently confirmed to
// have a separate `uuid` either), and reuses it as both the dedup key and
// the opaque Relay id `decodeGlobalId` expects for submission.

import { graphqlRequest, MAX_PAGE_SIZE } from "./openimis-client.server";

export interface CatalogEntry {
  id: string;
  globalId: string | null; // opaque Relay id, decode for mutation *Id: Int! args
  code: string;
  name: string;
}

interface CatalogNode {
  id: string;
  code: string | null;
  name: string | null;
}

const CATALOG_FIELDS = `id code name`;

function mapCatalogEntry(node: CatalogNode): CatalogEntry {
  return {
    id: node.id,
    globalId: node.id ?? null,
    code: node.code ?? "",
    name: node.name ?? "",
  };
}

async function fetchCatalog(rootField: string): Promise<CatalogEntry[]> {
  const query = `
    query Catalog($first: Int) {
      ${rootField}(first: $first) {
        edges { node { ${CATALOG_FIELDS} } }
      }
    }
  `;
  const data = await graphqlRequest<Record<string, { edges: { node: CatalogNode }[] }>>(query, {
    first: MAX_PAGE_SIZE,
  });
  return (data[rootField]?.edges ?? []).map((e) => mapCatalogEntry(e.node));
}

export const getOpenimisDiagnoses = () => fetchCatalog("diagnoses");
export const getOpenimisMedicalItems = () => fetchCatalog("medicalItems");
export const getOpenimisMedicalServices = () => fetchCatalog("medicalServices");
