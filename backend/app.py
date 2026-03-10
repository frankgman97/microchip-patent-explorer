import json
import re
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


def clean_patent(raw):
    md = raw.get("applicationMetaData", {})
    entity = md.get("entityStatusData", {})
    inventors = [inv["inventorNameText"] for inv in md.get("inventorBag", [])]
    cpcs = [re.sub(r"\s+", " ", c).strip() for c in md.get("cpcClassificationBag", [])]
    pub_cats = md.get("publicationCategoryBag", [])

    addr_bag = raw.get("correspondenceAddressBag", [])
    addr_raw = addr_bag[0] if addr_bag else {}
    address = None
    if addr_raw:
        street_parts = [addr_raw.get("addressLineOneText", ""), addr_raw.get("addressLineTwoText", "")]
        street = ", ".join(p for p in street_parts if p)
        address = {
            "name": addr_raw.get("nameLineOneText", ""),
            "street": street,
            "city": addr_raw.get("cityName", ""),
            "state": addr_raw.get("geographicRegionCode", ""),
            "zip": addr_raw.get("postalCode", ""),
            "country": addr_raw.get("countryCode", ""),
        }

    patent = {
        "applicationNumber": raw.get("applicationNumberText", ""),
        "title": md.get("inventionTitle", ""),
        "type": md.get("applicationTypeLabelName", ""),
        "status": md.get("applicationStatusDescriptionText", ""),
        "statusDate": md.get("applicationStatusDate", ""),
        "filingDate": md.get("filingDate", ""),
        "docketNumber": md.get("docketNumber", ""),
        "confirmationNumber": md.get("applicationConfirmationNumber"),
        "entityStatus": entity.get("businessEntityStatusCategory", ""),
        "customerNumber": md.get("customerNumber"),
        "groupArtUnit": md.get("groupArtUnitNumber", ""),
        "examiner": md.get("examinerNameText", ""),
        "firstInventorToFile": md.get("firstInventorToFileIndicator", "") == "Y",
        "inventors": inventors,
        "inventorCount": len(inventors),
        "cpcClassifications": cpcs,
        "publicationCategory": pub_cats[0] if pub_cats else "",
    }

    if md.get("earliestPublicationNumber"):
        patent["publicationNumber"] = md["earliestPublicationNumber"]
        patent["publicationDate"] = md.get("earliestPublicationDate", "")

    if md.get("patentNumber"):
        patent["patentNumber"] = md["patentNumber"]
        patent["grantDate"] = md.get("grantDate", "")

    if md.get("pctPublicationNumber"):
        patent["pctPublicationNumber"] = md["pctPublicationNumber"]
        patent["pctPublicationDate"] = md.get("pctPublicationDate", "")

    if address:
        patent["correspondenceAddress"] = address

    return patent


# Load and clean data at startup
with open("../microchip.json", "r") as f:
    raw_data = json.load(f)

patents = [clean_patent(p) for p in raw_data["patentdata"]]
print(f"Loaded {len(patents)} patents")


@app.route("/api/patents")
def get_patents():
    return jsonify(patents)


@app.route("/api/stats")
def get_stats():
    from collections import Counter

    by_type = Counter(p["type"] for p in patents)
    by_status = Counter(p["status"] for p in patents)
    by_year = Counter(p["filingDate"][:4] for p in patents if p.get("filingDate"))

    inventor_counts = Counter()
    for p in patents:
        for inv in p["inventors"]:
            inventor_counts[inv] += 1

    top_inventors = [
        {"name": name, "count": count}
        for name, count in inventor_counts.most_common(25)
    ]

    return jsonify({
        "totalPatents": len(patents),
        "byType": dict(by_type),
        "byStatus": dict(by_status),
        "byYear": dict(sorted(by_year.items())),
        "topInventors": top_inventors,
        "uniqueInventors": len(inventor_counts),
    })


if __name__ == "__main__":
    app.run(debug=True, port=5002)
