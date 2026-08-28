package schemas

import _ "embed"

//go:embed inherit-v3-bundled.json
var EstateBundled []byte

//go:embed catalogue-v3-bundled.json
var CatalogueBundled []byte
