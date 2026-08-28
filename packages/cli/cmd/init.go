package cmd

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/spf13/cobra"
)

// Flags for non-interactive mode
var (
	flagNonInteractive bool
	flagFull           bool
	flagDocType        string
	flagJurisdiction   string
	flagTestatorName   string
	flagExampleAssets  bool
	flagOutput         string
)

var initCmd = &cobra.Command{
	Use:   "init",
	Short: "Create a new INHERIT estate document",
	Long: `Create a new INHERIT estate document interactively or with flags.

In interactive mode (default), you'll be asked 5 questions with sensible
defaults — press Enter to accept each default.

Use --non-interactive with flags for CI/scripting:
  inherit init --non-interactive --jurisdiction scotland --testator "Angus McTavish"`,
	Args: cobra.NoArgs,
	Run:  runInit,
}

func init() {
	initCmd.Flags().BoolVar(&flagNonInteractive, "non-interactive", false, "Skip prompts, use flags and defaults")
	initCmd.Flags().BoolVar(&flagFull, "full", false, "Generate a Level 2 document with trusts, insurance, digital assets, and multiple bequests")
	initCmd.Flags().StringVar(&flagDocType, "type", "estate", "Document type: estate or catalogue")
	initCmd.Flags().StringVar(&flagJurisdiction, "jurisdiction", "england-wales", "Jurisdiction (e.g. england-wales, scotland, us-estate, none)")
	initCmd.Flags().StringVar(&flagTestatorName, "testator", "Jane Smith", "Testator full name (given family)")
	initCmd.Flags().BoolVar(&flagExampleAssets, "assets", true, "Include example assets")
	initCmd.Flags().StringVar(&flagOutput, "output", "", "Output filename (default: estate.json or catalogue.json)")
	rootCmd.AddCommand(initCmd)
}

// jurisdiction metadata for document generation
type jurisdictionInfo struct {
	ExtensionID string
	Name        string
	Country     string
	Subdivision string
	LegalSystem string
	SchemaURI   string
	DataBlock   string
}

var jurisdictions = map[string]jurisdictionInfo{
	"england-wales": {
		ExtensionID: "uk-england-wales",
		Name:        "England and Wales",
		Country:     "GB",
		Subdivision: "GB-ENG",
		LegalSystem: "common_law",
		SchemaURI:   "https://openinherit.org/v3/extensions/uk-england-wales/uk-england-wales.json",
		DataBlock:   "x-inherit-uk-england-wales",
	},
	"scotland": {
		ExtensionID: "scotland",
		Name:        "Scotland",
		Country:     "GB",
		Subdivision: "GB-SCT",
		LegalSystem: "mixed",
		SchemaURI:   "https://openinherit.org/v3/extensions/scotland/scotland.json",
		DataBlock:   "x-inherit-scotland",
	},
	"us-estate": {
		ExtensionID: "us-estate",
		Name:        "United States",
		Country:     "US",
		Subdivision: "US-NY",
		LegalSystem: "common_law",
		SchemaURI:   "https://openinherit.org/v3/extensions/us-estate/us-estate.json",
		DataBlock:   "x-inherit-us-estate",
	},
	"ireland": {
		ExtensionID: "ireland",
		Name:        "Ireland",
		Country:     "IE",
		Subdivision: "",
		LegalSystem: "common_law",
		SchemaURI:   "https://openinherit.org/v3/extensions/ireland/ireland.json",
		DataBlock:   "x-inherit-ireland",
	},
	"canada": {
		ExtensionID: "canada",
		Name:        "Canada",
		Country:     "CA",
		Subdivision: "CA-ON",
		LegalSystem: "common_law",
		SchemaURI:   "https://openinherit.org/v3/extensions/canada/canada.json",
		DataBlock:   "x-inherit-canada",
	},
	"australia-nz": {
		ExtensionID: "australia-nz",
		Name:        "Australia",
		Country:     "AU",
		Subdivision: "AU-NSW",
		LegalSystem: "common_law",
		SchemaURI:   "https://openinherit.org/v3/extensions/australia-nz/australia-nz.json",
		DataBlock:   "x-inherit-australia-nz",
	},
	"japan": {
		ExtensionID: "japan",
		Name:        "Japan",
		Country:     "JP",
		Subdivision: "",
		LegalSystem: "civil_law",
		SchemaURI:   "https://openinherit.org/v3/extensions/japan/japan.json",
		DataBlock:   "x-inherit-japan",
	},
	"eu-succession": {
		ExtensionID: "eu-succession",
		Name:        "European Union",
		Country:     "DE",
		Subdivision: "",
		LegalSystem: "civil_law",
		SchemaURI:   "https://openinherit.org/v3/extensions/eu-succession/eu-succession.json",
		DataBlock:   "x-inherit-eu-succession",
	},
	"india": {
		ExtensionID: "india",
		Name:        "India",
		Country:     "IN",
		Subdivision: "IN-MH",
		LegalSystem: "common_law",
		SchemaURI:   "https://openinherit.org/v3/extensions/india/india.json",
		DataBlock:   "x-inherit-india",
	},
	"singapore-malaysia": {
		ExtensionID: "singapore-malaysia",
		Name:        "Singapore",
		Country:     "SG",
		Subdivision: "",
		LegalSystem: "common_law",
		SchemaURI:   "https://openinherit.org/v3/extensions/singapore-malaysia/singapore-malaysia.json",
		DataBlock:   "x-inherit-singapore-malaysia",
	},
	"hong-kong": {
		ExtensionID: "hong-kong",
		Name:        "Hong Kong",
		Country:     "HK",
		Subdivision: "",
		LegalSystem: "common_law",
		SchemaURI:   "https://openinherit.org/v3/extensions/hong-kong/hong-kong.json",
		DataBlock:   "x-inherit-hong-kong",
	},
	"uae": {
		ExtensionID: "uae",
		Name:        "United Arab Emirates",
		Country:     "AE",
		Subdivision: "",
		LegalSystem: "mixed",
		SchemaURI:   "https://openinherit.org/v3/extensions/uae/uae.json",
		DataBlock:   "x-inherit-uae",
	},
}

// Realistic sample data per jurisdiction
type sampleData struct {
	ExecutorGiven     string
	ExecutorFamily    string
	BeneficiaryGiven  string
	BeneficiaryFamily string
	PropertyName      string
	PropertyAddress   map[string]any
	PropertyValue     int // minor units
	Currency          string
	BankName          string
	BankBalance       int
	PossessionName    string
	PossessionValue   int
}

func sampleForJurisdiction(jKey string) sampleData {
	switch jKey {
	case "scotland":
		return sampleData{
			ExecutorGiven: "Robert", ExecutorFamily: "Campbell",
			BeneficiaryGiven: "Isla", BeneficiaryFamily: "MacLeod",
			PropertyName: "42 Birch Lane, Edinburgh",
			PropertyAddress: map[string]any{
				"streetAddress":   "42 Birch Lane",
				"addressLocality": "Edinburgh",
				"addressRegion":   "City of Edinburgh",
				"postalCode":      "EH1 3DG",
				"addressCountry":  "GB",
			},
			PropertyValue: 31500000, Currency: "GBP",
			BankName: "Royal Bank of Scotland Current Account", BankBalance: 4250000,
			PossessionName: "Grandfather clock (mahogany, c.1890)", PossessionValue: 180000,
		}
	case "us-estate":
		return sampleData{
			ExecutorGiven: "Michael", ExecutorFamily: "Rodriguez",
			BeneficiaryGiven: "Sarah", BeneficiaryFamily: "Chen",
			PropertyName: "1847 Maple Drive, Brooklyn",
			PropertyAddress: map[string]any{
				"streetAddress":   "1847 Maple Drive",
				"addressLocality": "Brooklyn",
				"addressRegion":   "New York",
				"postalCode":      "11201",
				"addressCountry":  "US",
			},
			PropertyValue: 85000000, Currency: "USD",
			BankName: "Chase Savings Account", BankBalance: 12750000,
			PossessionName: "Martin D-28 acoustic guitar (1962)", PossessionValue: 350000,
		}
	case "japan":
		return sampleData{
			ExecutorGiven: "Kenji", ExecutorFamily: "Yamamoto",
			BeneficiaryGiven: "Yuki", BeneficiaryFamily: "Tanaka",
			PropertyName: "Setagaya Residence",
			PropertyAddress: map[string]any{
				"streetAddress":   "3-12-7 Setagaya",
				"addressLocality": "Setagaya-ku",
				"addressRegion":   "Tokyo",
				"postalCode":      "154-0017",
				"addressCountry":  "JP",
				"addressOrder":    "japanese",
			},
			PropertyValue: 4500000000, Currency: "JPY",
			BankName: "Mizuho Bank Savings", BankBalance: 850000000,
			PossessionName: "Meiji-era tansu chest (cedar, c.1880)", PossessionValue: 15000000,
		}
	case "ireland":
		return sampleData{
			ExecutorGiven: "Patrick", ExecutorFamily: "O'Brien",
			BeneficiaryGiven: "Siobhan", BeneficiaryFamily: "Murphy",
			PropertyName: "23 Liffey Road, Dublin",
			PropertyAddress: map[string]any{
				"streetAddress":   "23 Liffey Road",
				"addressLocality": "Dublin",
				"addressRegion":   "County Dublin",
				"postalCode":      "D08 X9F2",
				"addressCountry":  "IE",
			},
			PropertyValue: 42500000, Currency: "EUR",
			BankName: "AIB Current Account", BankBalance: 3850000,
			PossessionName: "Waterford Crystal decanter set (1975)", PossessionValue: 85000,
		}
	case "canada":
		return sampleData{
			ExecutorGiven: "David", ExecutorFamily: "Tremblay",
			BeneficiaryGiven: "Sophie", BeneficiaryFamily: "Nguyen",
			PropertyName: "78 Rosewood Crescent, Toronto",
			PropertyAddress: map[string]any{
				"streetAddress":   "78 Rosewood Crescent",
				"addressLocality": "Toronto",
				"addressRegion":   "Ontario",
				"postalCode":      "M5V 2T6",
				"addressCountry":  "CA",
			},
			PropertyValue: 92000000, Currency: "CAD",
			BankName: "TD Canada Trust Savings", BankBalance: 15500000,
			PossessionName: "Group of Seven print (Lawren Harris, Lake Superior)", PossessionValue: 450000,
		}
	case "australia-nz":
		return sampleData{
			ExecutorGiven: "James", ExecutorFamily: "Mitchell",
			BeneficiaryGiven: "Emily", BeneficiaryFamily: "O'Sullivan",
			PropertyName: "14 Banksia Close, Manly",
			PropertyAddress: map[string]any{
				"streetAddress":   "14 Banksia Close",
				"addressLocality": "Manly",
				"addressRegion":   "New South Wales",
				"postalCode":      "2095",
				"addressCountry":  "AU",
			},
			PropertyValue: 185000000, Currency: "AUD",
			BankName: "Commonwealth Bank Term Deposit", BankBalance: 22000000,
			PossessionName: "Sidney Nolan lithograph (Ned Kelly series, 1970)", PossessionValue: 750000,
		}
	case "india":
		return sampleData{
			ExecutorGiven: "Arjun", ExecutorFamily: "Patel",
			BeneficiaryGiven: "Priya", BeneficiaryFamily: "Sharma",
			PropertyName: "Flat 4B, Shanti Towers, Bandra",
			PropertyAddress: map[string]any{
				"streetAddress":   "Flat 4B, Shanti Towers",
				"addressLocality": "Mumbai",
				"addressRegion":   "Maharashtra",
				"postalCode":      "400050",
				"addressCountry":  "IN",
				"landmark":        "Near Bandstand Promenade",
				"addressOrder":    "indian",
			},
			PropertyValue: 2500000000, Currency: "INR",
			BankName: "HDFC Bank Fixed Deposit", BankBalance: 750000000,
			PossessionName: "Tanjore painting (gold leaf, c.1920)", PossessionValue: 25000000,
		}
	default: // england-wales and others
		return sampleData{
			ExecutorGiven: "Thomas", ExecutorFamily: "Henderson",
			BeneficiaryGiven: "Eleanor", BeneficiaryFamily: "Brightwell",
			PropertyName: "42 Birch Lane, Bristol",
			PropertyAddress: map[string]any{
				"streetAddress":   "42 Birch Lane",
				"addressLocality": "Bristol",
				"addressRegion":   "Somerset",
				"postalCode":      "BS8 4HG",
				"addressCountry":  "GB",
			},
			PropertyValue: 35000000, Currency: "GBP",
			BankName: "Nationwide Building Society ISA", BankBalance: 4250000,
			PossessionName: "Omega Seamaster wristwatch (1967)", PossessionValue: 320000,
		}
	}
}

func prompt(reader *bufio.Reader, question, defaultVal string) string {
	fmt.Printf("%s [%s] ", question, defaultVal)
	line, _ := reader.ReadString('\n')
	line = strings.TrimSpace(line)
	if line == "" {
		return defaultVal
	}
	return line
}

func runInit(cmd *cobra.Command, args []string) {
	var (
		docType       string
		jurisdiction  string
		testatorName  string
		includeAssets bool
		outputFile    string
	)

	if flagNonInteractive {
		docType = flagDocType
		jurisdiction = flagJurisdiction
		testatorName = flagTestatorName
		includeAssets = flagExampleAssets
		outputFile = flagOutput
	} else {
		reader := bufio.NewReader(os.Stdin)

		// Build jurisdiction choices string
		jList := "england-wales, scotland, us-estate, ireland, canada, australia-nz, japan, india, or none"

		docType = prompt(reader, "Document type? (estate or catalogue)", "estate")
		jurisdiction = prompt(reader, "Jurisdiction? ("+jList+")", "england-wales")
		testatorName = prompt(reader, "Testator name?", "Jane Smith")
		assetsAnswer := prompt(reader, "Include example assets? (yes or no)", "yes")
		includeAssets = strings.ToLower(assetsAnswer) == "yes" || strings.ToLower(assetsAnswer) == "y"

		defaultFilename := "estate.json"
		if docType == "catalogue" {
			defaultFilename = "catalogue.json"
		}
		outputFile = prompt(reader, "Output filename?", defaultFilename)
	}

	if outputFile == "" {
		if docType == "catalogue" {
			outputFile = "catalogue.json"
		} else {
			outputFile = "estate.json"
		}
	}

	// Parse testator name
	parts := strings.SplitN(testatorName, " ", 2)
	testatorGiven := parts[0]
	testatorFamily := ""
	if len(parts) > 1 {
		testatorFamily = parts[1]
	}

	var doc map[string]any
	if docType == "catalogue" {
		doc = buildCatalogue()
	} else if flagFull {
		doc = buildFullEstate(testatorGiven, testatorFamily, jurisdiction, includeAssets)
	} else {
		doc = buildEstate(testatorGiven, testatorFamily, jurisdiction, includeAssets)
	}

	out, err := json.MarshalIndent(doc, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %s\n", err)
		os.Exit(2)
	}

	if err := os.WriteFile(outputFile, append(out, '\n'), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing file: %s\n", err)
		os.Exit(2)
	}

	// Print helpful output
	jInfo, hasJ := jurisdictions[jurisdiction]
	jName := "no jurisdiction extension"
	if hasJ {
		jName = jInfo.Name
	}
	level := "Level 1"
	if flagFull {
		level = "Level 2"
	}

	fmt.Printf("\nCreated %s (%s, %s)\n\n", outputFile, jName, level)
	fmt.Printf("  Validate:     inherit validate %s\n", outputFile)
	fmt.Printf("  Add a trust:  see \"trusts\" in %s\n", outputFile)
	fmt.Printf("  Full example: inherit init --full\n")
	fmt.Printf("  Docs:         https://dev.openinherit.org/docs/getting-started\n")
}

// ExecuteInit is the testable entry point for the init command.
// Generates a minimal valid estate or catalogue document and writes JSON to w.
// Returns exit code: 0=success, 2=error.
func ExecuteInit(catalogue bool, w io.Writer) int {
	var doc map[string]any
	if catalogue {
		doc = buildCatalogue()
	} else {
		doc = buildEstate("Given", "Surname", "england-wales", false)
	}

	out, err := json.MarshalIndent(doc, "", "  ")
	if err != nil {
		fmt.Fprintf(w, "Error: cannot serialise document: %s\n", err)
		return 2
	}
	fmt.Fprintln(w, string(out))
	return 0
}

// ExecuteInitNonInteractive generates a document with specific parameters.
// Intended for testing — bypasses interactive prompts entirely.
// Returns exit code: 0=success, 2=error.
func ExecuteInitNonInteractive(docType, jurisdiction, testatorName string, includeAssets bool, w io.Writer) int {
	parts := strings.SplitN(testatorName, " ", 2)
	givenName := parts[0]
	familyName := ""
	if len(parts) > 1 {
		familyName = parts[1]
	}

	var doc map[string]any
	if docType == "catalogue" {
		doc = buildCatalogue()
	} else {
		doc = buildEstate(givenName, familyName, jurisdiction, includeAssets)
	}

	out, err := json.MarshalIndent(doc, "", "  ")
	if err != nil {
		fmt.Fprintf(w, "Error: cannot serialise document: %s\n", err)
		return 2
	}
	fmt.Fprintln(w, string(out))
	return 0
}

// ExecuteInitFull generates a Level 2 document with trusts, insurance,
// digital assets, and multiple bequests. Intended for testing.
// Returns exit code: 0=success, 2=error.
func ExecuteInitFull(testatorName, jurisdiction string, w io.Writer) int {
	parts := strings.SplitN(testatorName, " ", 2)
	givenName := parts[0]
	familyName := ""
	if len(parts) > 1 {
		familyName = parts[1]
	}

	doc := buildFullEstate(givenName, familyName, jurisdiction, true)

	out, err := json.MarshalIndent(doc, "", "  ")
	if err != nil {
		fmt.Fprintf(w, "Error: cannot serialise document: %s\n", err)
		return 2
	}
	fmt.Fprintln(w, string(out))
	return 0
}

func buildCatalogue() map[string]any {
	now := time.Now().UTC().Format(time.RFC3339)
	return map[string]any{
		"$schema":          "https://openinherit.org/v3/catalogue.json",
		"@context":         "https://openinherit.org/v3/context/inherit-v1.jsonld",
		"schemaVersion":    "3.0.0",
		"exportedAt":       now,
		"generator":        map[string]any{"name": "inherit-cli", "version": version},
		"assets":           []any{},
		"assetCollections": []any{},
		"valuations":       []any{},
		"dataProvenance":   "system_generated",
	}
}

func buildEstate(givenName, familyName, jKey string, includeAssets bool) map[string]any {
	now := time.Now().UTC().Format(time.RFC3339)
	sample := sampleForJurisdiction(jKey)

	testatorID := uuid.New().String()
	executorID := uuid.New().String()
	beneficiaryID := uuid.New().String()
	estateID := uuid.New().String()
	executorEntryID := uuid.New().String()

	// Build domicile
	jInfo, hasJ := jurisdictions[jKey]
	domicile := map[string]any{
		"country":      "GB",
		"subdivision":  "GB-ENG",
		"legalSystems": []string{"common_law"},
		"name":         "England and Wales",
	}
	if hasJ {
		domicile = map[string]any{
			"country":      jInfo.Country,
			"legalSystems": []string{jInfo.LegalSystem},
			"name":         jInfo.Name,
		}
		if jInfo.Subdivision != "" {
			domicile["subdivision"] = jInfo.Subdivision
		}
	}

	// People
	testator := map[string]any{
		"id":        testatorID,
		"givenName": givenName,
		"roles":     []string{"testator"},
	}
	if familyName != "" {
		testator["familyName"] = familyName
	}

	executor := map[string]any{
		"id":         executorID,
		"givenName":  sample.ExecutorGiven,
		"familyName": sample.ExecutorFamily,
		"roles":      []string{"executor"},
	}

	beneficiary := map[string]any{
		"id":         beneficiaryID,
		"givenName":  sample.BeneficiaryGiven,
		"familyName": sample.BeneficiaryFamily,
		"roles":      []string{"beneficiary"},
	}

	people := []map[string]any{testator, executor, beneficiary}

	// Executor entry
	executorEntry := map[string]any{
		"id":                executorEntryID,
		"personId":          executorID,
		"personIdDisplay":   sample.ExecutorGiven + " " + sample.ExecutorFamily,
		"role":              "primary",
	}

	// Properties, assets, bequests
	properties := []any{}
	assets := []any{}
	bequests := []any{}
	valuations := []any{}

	if includeAssets {
		propertyID := uuid.New().String()
		bankAssetID := uuid.New().String()
		possessionAssetID := uuid.New().String()
		bequestID := uuid.New().String()

		properties = append(properties, map[string]any{
			"id":                 propertyID,
			"name":               sample.PropertyName,
			"propertyType":       "detached",
			"address":            sample.PropertyAddress,
			"estimatedValue":     map[string]any{"amount": sample.PropertyValue, "currency": sample.Currency, "exponent": 2},
			"isPrimaryResidence": true,
		})

		assets = append(assets, map[string]any{
			"id":             bankAssetID,
			"name":           sample.BankName,
			"category":       "financial",
			"estimatedValue": map[string]any{"amount": sample.BankBalance, "currency": sample.Currency, "exponent": 2},
		})

		assets = append(assets, map[string]any{
			"id":             possessionAssetID,
			"name":           sample.PossessionName,
			"category":       "other",
			"estimatedValue": map[string]any{"amount": sample.PossessionValue, "currency": sample.Currency, "exponent": 2},
		})

		bequests = append(bequests, map[string]any{
			"id":                   bequestID,
			"bequestType":          "specific",
			"beneficiaryId":        beneficiaryID,
			"beneficiaryIdDisplay": sample.BeneficiaryGiven + " " + sample.BeneficiaryFamily,
			"description":          fmt.Sprintf("%s to be transferred to %s %s", sample.PossessionName, sample.BeneficiaryGiven, sample.BeneficiaryFamily),
			"assetIds":             []string{possessionAssetID},
		})
	}

	// Extensions
	extensions := []any{}
	doc := map[string]any{
		"$schema":       "https://openinherit.org/v3/schema.json",
		"@context":      "https://openinherit.org/v3/context/inherit-v1.jsonld",
		"schemaVersion": "3.0.0",
		"exportedAt":    now,
		"generator":     map[string]any{"name": "inherit-cli", "version": version},
		"estate": map[string]any{
			"id":                      estateID,
			"testatorPersonId":        testatorID,
			"testatorPersonIdDisplay": givenName + " " + familyName,
			"status":                  "planning",
			"createdAt":               now,
			"lastModifiedAt":          now,
			"domicile":                domicile,
		},
		"people":              people,
		"executors":           []any{executorEntry},
		"properties":          properties,
		"assets":              assets,
		"bequests":            bequests,
		"valuations":          valuations,
		"extensions":          extensions,
		"kinships":            []any{},
		"relationships":       []any{},
		"liabilities":         []any{},
		"trusts":              []any{},
		"guardians":           []any{},
		"wishes":              []any{},
		"documents":           []any{},
		"nonprobateTransfers": []any{},
		"proxyAuthorisations": []any{},
		"assetCollections":    []any{},
		"lifetimeTransfers":   []any{},
	}

	// Add jurisdiction extension if selected
	if hasJ {
		doc["extensions"] = []any{
			map[string]any{
				"id":        jInfo.ExtensionID,
				"version":   "1.0.0",
				"schema":    jInfo.SchemaURI,
				"scope":     []string{"estate"},
				"dataBlock": jInfo.DataBlock,
			},
		}
		doc[jInfo.DataBlock] = extensionDataFor(jKey)
	}

	return doc
}

func buildFullEstate(givenName, familyName, jKey string, includeAssets bool) map[string]any {
	doc := buildEstate(givenName, familyName, jKey, true)
	now := time.Now().UTC().Format(time.RFC3339)
	sample := sampleForJurisdiction(jKey)

	// Get existing person IDs
	people := doc["people"].([]map[string]any)
	testatorID := people[0]["id"].(string)
	beneficiaryID := people[2]["id"].(string)

	// Add a second beneficiary (spouse)
	spouseID := uuid.New().String()
	people = append(people, map[string]any{
		"id":         spouseID,
		"givenName":  "Margaret",
		"familyName": familyName,
		"roles":      []string{"beneficiary"},
	})
	doc["people"] = people

	// Add relationship (marriage)
	doc["relationships"] = []any{
		map[string]any{
			"id":   uuid.New().String(),
			"type": "marriage_civil",
			"partners": []any{
				map[string]any{"personId": testatorID, "ordinal": 1},
				map[string]any{"personId": spouseID, "ordinal": 2},
			},
			"currentStatus": "active",
		},
	}

	// Add trust
	trustID := uuid.New().String()
	doc["trusts"] = []any{
		map[string]any{
			"id":        trustID,
			"name":      "Family Discretionary Trust",
			"trustType": "discretionary",
			"createdAt": now,
			"settlor":   testatorID,
			"trustees": []any{
				map[string]any{
					"personId":        people[1]["id"],
					"personIdDisplay": sample.ExecutorGiven + " " + sample.ExecutorFamily,
					"role":            "trustee",
				},
			},
			"beneficiaries": []any{
				map[string]any{
					"personId":        beneficiaryID,
					"personIdDisplay": sample.BeneficiaryGiven + " " + sample.BeneficiaryFamily,
					"interestType":    "discretionary",
				},
				map[string]any{
					"personId":        spouseID,
					"personIdDisplay": "Margaret " + familyName,
					"interestType":    "income",
				},
			},
		},
	}

	// Add digital asset
	digitalAssetID := uuid.New().String()
	existingAssets := doc["assets"].([]any)
	existingAssets = append(existingAssets, map[string]any{
		"id":             digitalAssetID,
		"name":           "Cryptocurrency portfolio (Coinbase)",
		"category":       "digital",
		"estimatedValue": map[string]any{"amount": 850000, "currency": sample.Currency, "exponent": 2},
	})

	// Add insurance policy
	insurancePolicyID := uuid.New().String()
	existingAssets = append(existingAssets, map[string]any{
		"id":             insurancePolicyID,
		"name":           "Aviva Life Insurance Policy L-2847291",
		"category":       "financial",
		"subcategory":    "life_insurance",
		"estimatedValue": map[string]any{"amount": 25000000, "currency": sample.Currency, "exponent": 2},
	})
	doc["assets"] = existingAssets

	// Add residuary bequest to spouse
	existingBequests := doc["bequests"].([]any)
	existingBequests = append(existingBequests, map[string]any{
		"id":                   uuid.New().String(),
		"bequestType":          "residuary",
		"beneficiaryId":        spouseID,
		"beneficiaryIdDisplay": "Margaret " + familyName,
		"description":          "The residue of my estate to my spouse",
	})
	doc["bequests"] = existingBequests

	return doc
}

// extensionDataFor returns jurisdiction-appropriate extension data with correct
// field names and enum values matching the actual extension schemas.
func extensionDataFor(jKey string) map[string]any {
	switch jKey {
	case "england-wales":
		return map[string]any{
			"nilRateBand": map[string]any{
				"value":                32500000,
				"effectiveFrom":        "2009-04-06",
				"status":               "enacted",
				"legislativeReference": "Inheritance Tax Act 1984 s.7",
			},
			"residenceNilRateBand": map[string]any{
				"value":          17500000,
				"effectiveFrom": "2020-04-06",
				"status":        "enacted",
			},
			"inheritanceTaxRate": map[string]any{
				"value":                40,
				"effectiveFrom":        "1988-03-15",
				"status":               "enacted",
				"legislativeReference": "Inheritance Tax Act 1984 s.7 Sch.1",
			},
			"transferableNilRateBand": true,
		}
	case "scotland":
		// Schema fields: priorRights, legalRights, confirmation, cohabitationClaim, forcedHeirship
		// legalRights has: jusRelictae (string), legitim (string), notes (string)
		return map[string]any{
			"legalRights": map[string]any{
				"jusRelictae": "1/3",
				"legitim":     "1/3",
				"deadsPart":   "1/3",
			},
		}
	case "us-estate":
		// Required: state (pattern: ^US-[A-Z]{2}$)
		return map[string]any{
			"state":          "US-NY",
			"propertyRegime": "separate_property",
		}
	case "ireland":
		// spouseLegalRightShare has: fraction (string), hasChildren (bool), renounced (bool)
		return map[string]any{
			"spouseLegalRightShare": map[string]any{
				"fraction":    "1/3",
				"hasChildren": true,
				"renounced":   false,
			},
		}
	case "canada":
		// Required: province (pattern: ^CA-[A-Z]{2}$)
		return map[string]any{
			"province": "CA-ON",
		}
	case "australia-nz":
		// Required field: jurisdiction (enum)
		return map[string]any{
			"jurisdiction": "AU-NSW",
		}
	case "japan":
		// Schema fields: kosekiRecords, iryubunClaims, yoshiAdoptions
		return map[string]any{
			"iryubunClaims": []any{},
		}
	case "india":
		// Required field: personalLaw (enum)
		return map[string]any{
			"personalLaw": "indian_succession_act_1925",
		}
	default:
		return map[string]any{}
	}
}
