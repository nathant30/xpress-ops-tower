-- AI Glossary - Explain Like I'm 5 knowledge base for AI/ML terms
CREATE TABLE ai_glossary (
  id SERIAL PRIMARY KEY,
  term VARCHAR(100) UNIQUE NOT NULL,
  simple_definition TEXT NOT NULL,     -- Explain like I'm 5
  long_definition TEXT,
  examples JSONB,                      -- Usage examples and context
  category TEXT CHECK (category IN ('ml_basics','statistics','business','compliance','technical')),
  tags TEXT[],                         -- searchable tags
  last_updated TIMESTAMP NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  
  -- Search optimization
  search_vector tsvector
);

-- Full-text search index
CREATE INDEX ai_glossary_search_idx ON ai_glossary USING gin(search_vector);
CREATE INDEX ai_glossary_term_idx ON ai_glossary(lower(term));
CREATE INDEX ai_glossary_category_idx ON ai_glossary(category) WHERE category IS NOT NULL;

-- Update search vector trigger
CREATE OR REPLACE FUNCTION update_ai_glossary_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.term, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.simple_definition, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.long_definition, '')), 'C') ||
        setweight(to_tsvector('english', array_to_string(COALESCE(NEW.tags, ARRAY[]::TEXT[]), ' ')), 'D');
    NEW.last_updated = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_glossary_search_vector
    BEFORE INSERT OR UPDATE ON ai_glossary
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_glossary_search_vector();

-- Seed essential AI/ML terms
INSERT INTO ai_glossary (term, simple_definition, long_definition, category, tags) VALUES
('Confidence Score', 'How sure the AI is about its prediction, like being 90% sure it will rain.', 'A numerical measure (0-1 or 0-100%) indicating how certain a machine learning model is about its prediction. Higher confidence suggests more reliable predictions.', 'ml_basics', ARRAY['prediction', 'reliability', 'accuracy']),
('Model Drift', 'When AI gets worse over time because the world changes, like a weather app becoming less accurate.', 'The degradation of model performance over time due to changes in the underlying data patterns or relationships that the model was trained on.', 'ml_basics', ARRAY['performance', 'monitoring', 'degradation']),
('MAPE', 'Mean Absolute Percentage Error - how far off our predictions are on average.', 'A statistical measure that calculates the average percentage difference between predicted and actual values. Lower MAPE indicates better accuracy.', 'statistics', ARRAY['accuracy', 'error', 'forecasting']),
('Surge Multiplier', 'When prices go up during busy times, like expensive rides during rush hour.', 'A pricing factor applied during high-demand periods to balance supply and demand by incentivizing more drivers and managing passenger demand.', 'business', ARRAY['pricing', 'demand', 'supply']),
('ROI', 'Return on Investment - how much money you make compared to what you spend.', 'A performance measure used to evaluate the efficiency of an investment, calculated as (Gain - Cost) / Cost × 100%.', 'business', ARRAY['finance', 'profitability', 'investment']),
('Regulatory Compliance', 'Following the rules set by government agencies like LTFRB.', 'Adherence to laws, regulations, guidelines and specifications relevant to business operations, particularly transportation regulations in the Philippines.', 'compliance', ARRAY['legal', 'ltfrb', 'regulations']),
('Feature Importance', 'Which factors the AI thinks are most important for making predictions.', 'A measure indicating how much each input variable contributes to the model''s predictions, helping explain what drives AI decisions.', 'technical', ARRAY['explainability', 'interpretability', 'modeling']);

-- Comments
COMMENT ON TABLE ai_glossary IS 'AI/ML knowledge base with simple explanations for all stakeholders';
COMMENT ON COLUMN ai_glossary.simple_definition IS 'Explain Like I''m 5 definition for general understanding';
COMMENT ON COLUMN ai_glossary.examples IS 'JSON with usage examples and real-world contexts';