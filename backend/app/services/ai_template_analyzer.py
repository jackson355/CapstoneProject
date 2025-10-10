"""
AI Template Analysis Service
Uses OpenAI to analyze documents and suggest template improvements
"""

from typing import Dict, List, Any, Optional
import json
import re
from pydantic import BaseModel
from openai import AsyncOpenAI
import asyncio


class TemplateVariable(BaseModel):
    """Represents a variable suggestion from AI analysis"""
    name: str
    original_text: str
    suggested_placeholder: str
    description: str
    type: str  # text, number, date, email, currency, etc.
    context: str
    confidence: float
    start_position: Optional[int] = None
    end_position: Optional[int] = None


class TextImprovement(BaseModel):
    """Represents a text improvement suggestion"""
    location: str
    original_text: str
    improved_text: str
    improvement_type: str  # grammar, clarity, professional_tone, conciseness


class TemplateAnalysisResult(BaseModel):
    """Complete analysis result from AI"""
    template_type: str
    confidence_score: float
    variables: List[TemplateVariable]
    text_improvements: List[TextImprovement]
    suggestions: List[str]
    document_category: str
    placeholder_format: str  # mustache, bracket, etc.
    summary: str


class AITemplateAnalyzer:
    """
    Analyzes document text using OpenAI to identify template variables
    and suggest improvements for reusability
    """

    def __init__(self):
        self.client = None

    def _get_client(self, api_key: str) -> AsyncOpenAI:
        """Get or create OpenAI client with provided API key"""
        return AsyncOpenAI(api_key=api_key)

    async def analyze_document_for_template(
        self,
        document_text: str,
        api_key: str,
        document_metadata: Optional[Dict[str, Any]] = None
    ) -> TemplateAnalysisResult:
        """
        Analyze document text to suggest template improvements

        Args:
            document_text: Clean text extracted from document
            api_key: OpenAI API key
            document_metadata: Optional metadata about the document

        Returns:
            Structured analysis result
        """
        client = self._get_client(api_key)

        # Prepare the analysis prompt
        prompt = self._build_analysis_prompt(document_text, document_metadata)

        try:
            print(f"[DEBUG] Sending to AI - Document text length: {len(document_text)}")
            print(f"[DEBUG] Document text preview: {document_text[:500]}...")

            response = await client.chat.completions.create(
                model="gpt-4o-mini",  # Use cost-effective mini model
                messages=[
                    {
                        "role": "system",
                        "content": self._get_system_prompt()
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,  # Low temperature for consistent results
                max_tokens=4000,
                response_format={"type": "json_object"}
            )

            # Parse the response
            result_text = response.choices[0].message.content
            print(f"[DEBUG] Raw AI response: {result_text}")

            result_data = json.loads(result_text)
            print(f"[DEBUG] Parsed AI response - Variables: {len(result_data.get('variables', []))}, Text Improvements: {len(result_data.get('text_improvements', []))}")

            # Log text improvements specifically
            if result_data.get('text_improvements'):
                for i, improvement in enumerate(result_data['text_improvements']):
                    print(f"[DEBUG] Text Improvement {i}: {improvement.get('original_text')} -> {improvement.get('improved_text')}")

            # Convert to structured result
            return self._parse_ai_response(result_data, document_text)

        except Exception as e:
            raise Exception(f"AI analysis failed: {str(e)}")

    def _get_system_prompt(self) -> str:
        """Get the system prompt for AI analysis"""
        return """You are an expert business document analyst specialized in converting static documents into reusable templates and improving text quality.

Your task is to analyze business documents and identify:
1. Text that should become variables (names, dates, amounts, addresses, etc.)
2. Text that can be improved for grammar, clarity, and professionalism
3. Document type and category
4. Suggestions for improving template reusability

You must respond with valid JSON in this exact format:
{
  "template_type": "quotation|invoice|contract|letter|proposal|other",
  "document_category": "brief description of document purpose",
  "confidence_score": 0.85,
  "placeholder_format": "mustache",
  "summary": "Brief summary of the document and suggested changes",
  "variables": [
    {
      "name": "client_company_name",
      "original_text": "Acme Corporation",
      "suggested_placeholder": "{{client_company_name}}",
      "description": "Client company name",
      "type": "text",
      "context": "Invoice for Acme Corporation services",
      "confidence": 0.9
    },
    {
      "name": "my_company_name",
      "original_text": "ABC Services Ltd",
      "suggested_placeholder": "{{my_company_name}}",
      "description": "My company name",
      "type": "text",
      "context": "The service provider company name",
      "confidence": 0.9
    },
    {
      "name": "my_company_address",
      "original_text": "123 Business St, City, State 12345",
      "suggested_placeholder": "{{my_company_address}}",
      "description": "My company address",
      "type": "address",
      "context": "Service provider company address",
      "confidence": 0.9
    }
  ],
  "text_improvements": [
    {
      "location": "Paragraph 2",
      "original_text": "We will deliver the goods quick.",
      "improved_text": "We will deliver the goods quickly.",
      "improvement_type": "grammar"
    },
    {
      "location": "Paragraph 3",
      "original_text": "The pricexx are the best",
      "improved_text": "The prices are the best",
      "improvement_type": "spelling"
    },
    {
      "location": "Paragraph 4",
      "original_text": "tessufinhaoilfnas",
      "improved_text": "",
      "improvement_type": "remove_nonsense"
    }
  ],
  "suggestions": [
    "Replace static company name with {{company_name}} variable",
    "Convert fixed date to {{invoice_date}} for reusability",
    "Improve grammar in delivery section"
  ]
}

Variable types: text, number, currency, date, email, phone, address, percentage, boolean
Always use lowercase_underscore naming for variables.
Improvement types: grammar, spelling, clarity, professional_tone, conciseness, remove_nonsense, typo_fix
Confidence should be 0.0-1.0 based on how certain you are that text should be a variable.

CRITICAL: You MUST find and fix obvious spelling errors and typos. Don't be conservative with text improvements."""

    def _build_analysis_prompt(
        self,
        document_text: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Build the analysis prompt for the document"""

        prompt = f"""Please analyze this business document and convert it into a reusable template while also improving text quality.

DOCUMENT TO ANALYZE:
{document_text}

CRITICAL TEXT IMPROVEMENT REQUIREMENT:
You MUST identify and fix ALL spelling errors, typos, and nonsense words in the document. Look for:
- Obvious typos like "pricexx" (should be "prices")
- Nonsense words like "tessufinhaoilfnas" (should be removed or corrected)
- Misspelled words of any kind
- Incomplete or garbled text
Do NOT be conservative - if you see ANY spelling error or typo, you MUST include it in text_improvements.

ANALYSIS REQUIREMENTS:
1. Identify text that should be variables (company names, dates, amounts, addresses, contact info, etc.)
2. Identify text that can be improved for grammar, clarity, and professionalism
3. Look for patterns like [Company Name], {{amount}}, XXX, or obvious placeholders that are already present
4. Consider what parts would change between different uses of this document
5. Suggest a template type based on content (quotation and invoice)
6. Provide helpful suggestions for making the template more reusable

VARIABLE IDENTIFICATION GUIDELINES:
- Client company/organization names (use client_company_name, client_address, etc.)
- My company details (use my_company_name, my_company_address, my_company_phone, etc.)
- Person names and titles (both client and my company contacts)
- Dates (specific dates that would change per use)
- Monetary amounts and prices
- Addresses and contact information (differentiate between client and my company)
- Project/service descriptions that vary
- Reference numbers and IDs
- Quantities and measurements

TEXT IMPROVEMENT GUIDELINES:
- Fix ALL spelling errors and typos (e.g., "pricexx" → "prices", "tessufinhaoilfnas" → remove or fix)
- Fix grammar errors (verb tense, subject-verb agreement, etc.)
- Improve word choice and clarity
- Enhance professional tone
- Make text more concise while preserving meaning
- Fix punctuation and capitalization
- Identify and fix nonsense words or obvious typos
- Fix incomplete words or garbled text
- ALWAYS suggest improvements for ANY text that contains spelling errors or typos

IMPORTANT:
- Don't suggest variables for generic text like "Total", "Date", "Amount" labels
- Focus on the actual values, not the labels
- Consider context - some specific text might be intentionally static
- Suggest {{variable_name}} format using mustache syntax
- Be conservative - only suggest variables for text that would likely change
- Be proactive in suggesting improvements for ANY text with errors, typos, or poor grammar
- Don't change technical terms, proper nouns, or brand names (unless they're clearly misspelled)
- If you see obvious typos like "pricexx", "tessufinhaoilfnas", or similar nonsense, ALWAYS suggest corrections

Respond with valid JSON only."""

        if metadata:
            prompt += f"\n\nDOCUMENT METADATA:\n{json.dumps(metadata, indent=2)}"

        return prompt

    def _parse_ai_response(
        self,
        response_data: Dict[str, Any],
        original_text: str
    ) -> TemplateAnalysisResult:
        """Parse AI response into structured result"""

        variables = []
        for var_data in response_data.get("variables", []):
            # Find position of original text in document
            original_text_val = var_data.get("original_text", "")
            start_pos = None
            end_pos = None

            if original_text_val:
                # Find the position in the original text
                match = re.search(re.escape(original_text_val), original_text, re.IGNORECASE)
                if match:
                    start_pos = match.start()
                    end_pos = match.end()

            variable = TemplateVariable(
                name=var_data.get("name", ""),
                original_text=original_text_val,
                suggested_placeholder=var_data.get("suggested_placeholder", ""),
                description=var_data.get("description", ""),
                type=var_data.get("type", "text"),
                context=var_data.get("context", ""),
                confidence=float(var_data.get("confidence", 0.5)),
                start_position=start_pos,
                end_position=end_pos
            )
            variables.append(variable)

        # Sort variables by position in document
        variables.sort(key=lambda x: x.start_position if x.start_position is not None else 0)

        # Parse text improvements
        text_improvements = []
        for improvement_data in response_data.get("text_improvements", []):
            improvement = TextImprovement(
                location=improvement_data.get("location", ""),
                original_text=improvement_data.get("original_text", ""),
                improved_text=improvement_data.get("improved_text", ""),
                improvement_type=improvement_data.get("improvement_type", "grammar")
            )
            text_improvements.append(improvement)

        return TemplateAnalysisResult(
            template_type=response_data.get("template_type", "other"),
            confidence_score=float(response_data.get("confidence_score", 0.5)),
            variables=variables,
            text_improvements=text_improvements,
            suggestions=response_data.get("suggestions", []),
            document_category=response_data.get("document_category", ""),
            placeholder_format=response_data.get("placeholder_format", "mustache"),
            summary=response_data.get("summary", "")
        )

    async def apply_suggestions_to_text(
        self,
        original_text: str,
        accepted_variables: List[TemplateVariable]
    ) -> str:
        """
        Apply accepted variable suggestions to the original text

        Args:
            original_text: Original document text
            accepted_variables: List of variables the user accepted

        Returns:
            Modified text with placeholders applied
        """
        modified_text = original_text

        # Sort variables by position (descending) to avoid position shifting
        sorted_variables = sorted(
            accepted_variables,
            key=lambda x: x.start_position if x.start_position is not None else 0,
            reverse=True
        )

        for variable in sorted_variables:
            if variable.start_position is not None and variable.end_position is not None:
                # Replace the specific occurrence at the known position
                before = modified_text[:variable.start_position]
                after = modified_text[variable.end_position:]
                modified_text = before + variable.suggested_placeholder + after
            else:
                # Fallback: replace first occurrence
                modified_text = modified_text.replace(
                    variable.original_text,
                    variable.suggested_placeholder,
                    1
                )

        return modified_text

    def generate_variable_definitions(
        self,
        variables: List[TemplateVariable]
    ) -> List[Dict[str, Any]]:
        """
        Generate variable definitions for template metadata

        Args:
            variables: List of template variables

        Returns:
            List of variable definitions
        """
        definitions = []

        for var in variables:
            definition = {
                "name": var.name,
                "placeholder": var.suggested_placeholder,
                "description": var.description,
                "type": var.type,
                "default_value": "",
                "required": True,
                "original_text": var.original_text
            }
            definitions.append(definition)

        return definitions

    async def validate_template_conversion(
        self,
        original_text: str,
        converted_text: str,
        variables: List[TemplateVariable],
        api_key: str
    ) -> Dict[str, Any]:
        """
        Validate that the template conversion makes sense

        Args:
            original_text: Original document text
            converted_text: Text with variables applied
            variables: List of variables that were applied
            api_key: OpenAI API key

        Returns:
            Validation result with feedback
        """
        client = self._get_client(api_key)

        validation_prompt = f"""Please validate this template conversion:

ORIGINAL TEXT:
{original_text[:2000]}...

CONVERTED TEMPLATE:
{converted_text[:2000]}...

VARIABLES APPLIED:
{json.dumps([{"name": v.name, "placeholder": v.suggested_placeholder, "original": v.original_text} for v in variables], indent=2)}

Please check:
1. Are the variable replacements appropriate?
2. Is the template still readable and professional?
3. Are there any missed opportunities for variables?
4. Are there any variables that shouldn't have been created?

Respond with JSON:
{{
  "is_valid": true/false,
  "quality_score": 0.85,
  "issues": ["list of issues found"],
  "suggestions": ["additional suggestions"],
  "missed_variables": ["variables that could be added"]
}}"""

        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a template validation expert. Analyze template conversions for quality and appropriateness."
                    },
                    {
                        "role": "user",
                        "content": validation_prompt
                    }
                ],
                temperature=0.1,
                max_tokens=1000,
                response_format={"type": "json_object"}
            )

            return json.loads(response.choices[0].message.content)

        except Exception as e:
            return {
                "is_valid": True,
                "quality_score": 0.7,
                "issues": [f"Validation failed: {str(e)}"],
                "suggestions": [],
                "missed_variables": []
            }


# Create global instance
ai_template_analyzer = AITemplateAnalyzer()